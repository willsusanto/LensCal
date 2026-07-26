import { NextResponse } from 'next/server';

import { getActivePushSubscriptions } from '@/lib/data';
import { createClient } from '@/lib/supabase/server';
import {
  isGonePushSubscriptionError,
  sendWebPushNotification,
  webPushErrorMessage,
} from '@/lib/web-push';

export const runtime = 'nodejs';

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const subscriptions = await getActivePushSubscriptions(supabase, user.id);
    if (subscriptions.length === 0) {
      return NextResponse.json(
        { error: 'No active Web Push subscription is registered for this account.' },
        { status: 409 },
      );
    }

    let sent = 0;
    const errors: string[] = [];

    await Promise.all(
      subscriptions.map(async (subscription) => {
        try {
          await sendWebPushNotification(subscription, {
            title: 'LensCal reminders are ready',
            options: {
              body: 'This is a test Web Push notification from LensCal.',
              icon: '/icon-192.png',
              badge: '/icon-192.png',
              tag: 'lenscal-test-notification',
              renotify: true,
              data: { url: '/' },
            },
          });
          sent += 1;
        } catch (error) {
          errors.push(
            isGonePushSubscriptionError(error)
              ? 'A browser subscription has expired. Disable and re-enable reminders on that device.'
              : webPushErrorMessage(error),
          );
        }
      }),
    );

    if (sent === 0) {
      return NextResponse.json(
        { error: errors.join(' | ').slice(0, 1000) || 'The test Web Push notification failed.' },
        { status: 502 },
      );
    }

    return NextResponse.json({ sent, failed: errors.length });
  } catch (error) {
    return NextResponse.json({ error: webPushErrorMessage(error) }, { status: 500 });
  }
}
