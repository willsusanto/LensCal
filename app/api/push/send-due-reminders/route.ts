import { timingSafeEqual } from 'node:crypto';

import { NextResponse } from 'next/server';

import { normalizeNotificationReminders } from '@/constants/lens';
import {
  claimPushReminderDelivery,
  completePushReminderDelivery,
  getPushReminderSourceData,
  recordPushSubscriptionFailure,
  recordPushSubscriptionSuccess,
  type ActiveReminderLens,
} from '@/lib/data';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  isGonePushSubscriptionError,
  sendWebPushNotification,
  webPushErrorMessage,
} from '@/lib/web-push';
import type { NotificationReminder, PushSubscriptionRecord } from '@/types/lens';

export const runtime = 'nodejs';

function jsonResponse(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status });
}

function getCronSecret() {
  const cronSecret = process.env.PUSH_CRON_SECRET;
  if (!cronSecret) {
    throw new Error('PUSH_CRON_SECRET is required.');
  }
  return cronSecret;
}

function hasValidCronAuthorization(request: Request, expectedSecret: string) {
  const authorization = request.headers.get('authorization');
  const prefix = 'Bearer ';
  if (!authorization?.startsWith(prefix)) return false;

  const provided = Buffer.from(authorization.slice(prefix.length));
  const expected = Buffer.from(expectedSecret);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

function reminderKey(reminder: NotificationReminder) {
  return `${reminder.daysBefore}:${reminder.hour}:${reminder.minute}`;
}

function deliveryKey(reminder: NotificationReminder, subscriptionId: string) {
  return `${reminderKey(reminder)}:${subscriptionId}`;
}

function scheduledDateFor(lens: ActiveReminderLens, reminder: NotificationReminder) {
  const scheduledFor = new Date(lens.expires_at);
  scheduledFor.setDate(scheduledFor.getDate() - reminder.daysBefore);
  scheduledFor.setHours(reminder.hour, reminder.minute, 0, 0);
  return scheduledFor;
}

function duePhrase(daysBefore: number) {
  if (daysBefore === 0) return 'today';
  if (daysBefore === 1) return 'tomorrow';
  return `in ${daysBefore} days`;
}

async function sendReminderToSubscription(
  supabase: ReturnType<typeof createAdminClient>,
  lens: ActiveReminderLens,
  reminder: NotificationReminder,
  subscription: PushSubscriptionRecord,
  scheduledForIso: string,
) {
  if (!lens.user_id) return 'skipped' as const;

  const deliveryId = await claimPushReminderDelivery(supabase, {
    userId: lens.user_id,
    lensUsageId: lens.id,
    deliveryKey: deliveryKey(reminder, subscription.id),
    scheduledFor: scheduledForIso,
  });
  if (!deliveryId) return 'skipped' as const;

  try {
    await sendWebPushNotification(subscription, {
      title: 'Time to replace your lens',
      options: {
        body: `Your ${lens.eye} ${lens.lens_type} lens is due for replacement ${duePhrase(
          reminder.daysBefore,
        )}.`,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: `${lens.id}:${reminderKey(reminder)}`,
        renotify: true,
        data: { url: '/' },
      },
    });
  } catch (error) {
    const message = webPushErrorMessage(error);
    await Promise.all([
      recordPushSubscriptionFailure(
        supabase,
        lens.user_id,
        subscription,
        isGonePushSubscriptionError(error),
      ),
      completePushReminderDelivery(supabase, deliveryId, {
        status: 'failed',
        error: message,
      }),
    ]);
    return 'failed' as const;
  }

  await completePushReminderDelivery(supabase, deliveryId, { status: 'sent' });
  await recordPushSubscriptionSuccess(supabase, lens.user_id, subscription.id);
  return 'sent' as const;
}

export async function POST(request: Request) {
  let cronSecret: string;
  try {
    cronSecret = getCronSecret();
  } catch (error) {
    return jsonResponse(500, { error: webPushErrorMessage(error) });
  }

  if (!hasValidCronAuthorization(request, cronSecret)) {
    return jsonResponse(401, { error: 'Unauthorized.' });
  }

  try {
    const supabase = createAdminClient();
    const { lenses, settings, subscriptions } = await getPushReminderSourceData(supabase);
    const now = Date.now();

    const settingsByUserId = new Map(settings.map((row) => [row.user_id, row]));
    const subscriptionsByUserId = new Map<string, PushSubscriptionRecord[]>();
    for (const subscription of subscriptions) {
      const userSubscriptions = subscriptionsByUserId.get(subscription.user_id) ?? [];
      userSubscriptions.push(subscription);
      subscriptionsByUserId.set(subscription.user_id, userSubscriptions);
    }

    let candidates = 0;
    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const lens of lenses) {
      if (!lens.user_id) continue;

      const settingsRow = settingsByUserId.get(lens.user_id);
      const userSubscriptions = subscriptionsByUserId.get(lens.user_id) ?? [];
      if (!settingsRow || userSubscriptions.length === 0) continue;

      const reminders = normalizeNotificationReminders(settingsRow.notification_reminders, []);
      for (const reminder of reminders) {
        const scheduledFor = scheduledDateFor(lens, reminder);
        if (scheduledFor.getTime() > now) continue;

        candidates += 1;
        const results = await Promise.all(
          userSubscriptions.map((subscription) =>
            sendReminderToSubscription(
              supabase,
              lens,
              reminder,
              subscription,
              scheduledFor.toISOString(),
            ),
          ),
        );

        for (const result of results) {
          if (result === 'sent') sent += 1;
          if (result === 'failed') failed += 1;
          if (result === 'skipped') skipped += 1;
        }
      }
    }

    return jsonResponse(200, { candidates, sent, failed, skipped });
  } catch (error) {
    return jsonResponse(500, { error: webPushErrorMessage(error) });
  }
}
