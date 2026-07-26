import webPush, { WebPushError, type PushSubscription } from 'web-push';

import type { PushSubscriptionRecord } from '@/types/lens';

export type WebPushPayload = {
  title: string;
  options: {
    body: string;
    icon?: string;
    badge?: string;
    tag?: string;
    renotify?: boolean;
    data?: { url?: string };
  };
};

let configured = false;

function configureWebPush() {
  if (configured) return;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) {
    throw new Error('NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_SUBJECT are required.');
  }

  webPush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

function toWebPushSubscription(subscription: PushSubscriptionRecord): PushSubscription {
  return {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  };
}

export async function sendWebPushNotification(
  subscription: PushSubscriptionRecord,
  payload: WebPushPayload,
  ttl = 86_400,
) {
  configureWebPush();
  await webPush.sendNotification(toWebPushSubscription(subscription), JSON.stringify(payload), { TTL: ttl });
}

export function isGonePushSubscriptionError(error: unknown) {
  return error instanceof WebPushError && (error.statusCode === 404 || error.statusCode === 410);
}

export function webPushErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown Web Push error.';
}
