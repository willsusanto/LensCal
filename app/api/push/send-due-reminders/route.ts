import { NextResponse } from 'next/server';
import webPush, { WebPushError, type PushSubscription } from 'web-push';

import { normalizeNotificationReminders } from '@/constants/lens';
import { createAdminClient } from '@/lib/supabase/admin';
import type { LensUsage, NotificationReminder } from '@/types/lens';

export const runtime = 'nodejs';

type SettingsRow = {
  user_id: string;
  notifications_enabled: boolean;
  notification_reminders: unknown;
};

type PushSubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  failure_count: number;
};

function jsonResponse(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status });
}

function assertServerPushEnv() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  const cronSecret = process.env.PUSH_CRON_SECRET;

  if (!publicKey || !privateKey || !subject || !cronSecret) {
    throw new Error(
      'NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, and PUSH_CRON_SECRET are required.',
    );
  }

  webPush.setVapidDetails(subject, publicKey, privateKey);

  return { cronSecret };
}

function reminderKey(reminder: NotificationReminder) {
  return `${reminder.daysBefore}:${reminder.hour}:${reminder.minute}`;
}

function scheduledDateFor(lens: LensUsage, reminder: NotificationReminder) {
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

function pushSubscriptionFromRow(row: PushSubscriptionRow): PushSubscription {
  return {
    endpoint: row.endpoint,
    keys: {
      p256dh: row.p256dh,
      auth: row.auth,
    },
  };
}

function isGoneSubscriptionError(error: unknown) {
  return error instanceof WebPushError && (error.statusCode === 404 || error.statusCode === 410);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown Web Push error.';
}

export async function POST(request: Request) {
  let cronSecret: string;

  try {
    ({ cronSecret } = assertServerPushEnv());
  } catch (error) {
    return jsonResponse(500, { error: errorMessage(error) });
  }

  const authorization = request.headers.get('authorization');
  if (authorization !== `Bearer ${cronSecret}`) {
    return jsonResponse(401, { error: 'Unauthorized.' });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const nowIso = now.toISOString();

  const [
    { data: lenses, error: lensesError },
    { data: settingsRows, error: settingsError },
    { data: subscriptionRows, error: subscriptionsError },
  ] = await Promise.all([
    supabase.from('lens_usages').select('*').eq('status', 'active'),
    supabase
      .from('user_settings')
      .select('user_id, notifications_enabled, notification_reminders')
      .eq('notifications_enabled', true),
    supabase
      .from('push_subscriptions')
      .select('id, user_id, endpoint, p256dh, auth, failure_count')
      .is('revoked_at', null),
  ]);

  if (lensesError) return jsonResponse(500, { error: lensesError.message });
  if (settingsError) return jsonResponse(500, { error: settingsError.message });
  if (subscriptionsError) return jsonResponse(500, { error: subscriptionsError.message });

  const settingsByUserId = new Map<string, SettingsRow>();
  for (const row of (settingsRows ?? []) as SettingsRow[]) {
    settingsByUserId.set(row.user_id, row);
  }

  const subscriptionsByUserId = new Map<string, PushSubscriptionRow[]>();
  for (const row of (subscriptionRows ?? []) as PushSubscriptionRow[]) {
    const rows = subscriptionsByUserId.get(row.user_id) ?? [];
    rows.push(row);
    subscriptionsByUserId.set(row.user_id, rows);
  }

  let candidates = 0;
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const lens of (lenses ?? []) as LensUsage[]) {
    if (!lens.user_id) continue;

    const settings = settingsByUserId.get(lens.user_id);
    const subscriptions = subscriptionsByUserId.get(lens.user_id) ?? [];
    if (!settings || subscriptions.length === 0) continue;

    const reminders = normalizeNotificationReminders(settings.notification_reminders, []);

    for (const reminder of reminders) {
      const scheduledFor = scheduledDateFor(lens, reminder);
      if (scheduledFor.getTime() > now.getTime()) continue;

      candidates += 1;

      const key = reminderKey(reminder);
      const scheduledForIso = scheduledFor.toISOString();
      const { data: existingDelivery, error: existingDeliveryError } = await supabase
        .from('push_reminder_deliveries')
        .select('id')
        .eq('user_id', lens.user_id)
        .eq('lens_usage_id', lens.id)
        .eq('reminder_key', key)
        .eq('scheduled_for', scheduledForIso)
        .maybeSingle();

      if (existingDeliveryError) return jsonResponse(500, { error: existingDeliveryError.message });
      if (existingDelivery) {
        skipped += 1;
        continue;
      }

      let successCount = 0;
      const errors: string[] = [];

      await Promise.all(
        subscriptions.map(async (subscription) => {
          try {
            await webPush.sendNotification(
              pushSubscriptionFromRow(subscription),
              JSON.stringify({
                title: 'Time to replace your lens',
                options: {
                  body: `Your ${lens.eye} ${lens.lens_type} lens is due for replacement ${duePhrase(
                    reminder.daysBefore,
                  )}.`,
                  icon: '/icon-192.png',
                  badge: '/icon-192.png',
                  tag: `${lens.id}:${key}`,
                  renotify: true,
                  data: { url: '/' },
                },
              }),
              { TTL: 86_400 },
            );

            successCount += 1;
            await supabase
              .from('push_subscriptions')
              .update({ last_success_at: nowIso, failure_count: 0, updated_at: nowIso })
              .eq('id', subscription.id);
          } catch (error) {
            errors.push(errorMessage(error));

            await supabase
              .from('push_subscriptions')
              .update({
                last_failure_at: nowIso,
                failure_count: subscription.failure_count + 1,
                revoked_at: isGoneSubscriptionError(error) ? nowIso : null,
                updated_at: nowIso,
              })
              .eq('id', subscription.id);
          }
        }),
      );

      const deliveryStatus = successCount > 0 ? 'sent' : 'failed';
      const { error: deliveryError } = await supabase.from('push_reminder_deliveries').insert({
        id: `prd_${crypto.randomUUID().replaceAll('-', '')}`,
        user_id: lens.user_id,
        lens_usage_id: lens.id,
        reminder_key: key,
        scheduled_for: scheduledForIso,
        sent_at: successCount > 0 ? nowIso : null,
        status: deliveryStatus,
        error: errors.length > 0 ? errors.join(' | ').slice(0, 1000) : null,
      });

      if (deliveryError && deliveryError.code !== '23505') {
        return jsonResponse(500, { error: deliveryError.message });
      }

      if (successCount > 0) {
        sent += successCount;
      } else {
        failed += 1;
      }
    }
  }

  return jsonResponse(200, {
    candidates,
    sent,
    failed,
    skipped,
  });
}
