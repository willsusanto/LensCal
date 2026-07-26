import type { PushSubscriptionInput } from '@/types/lens';

export type NotificationSupportState =
  | 'unsupported'
  | 'default'
  | 'granted'
  | 'denied';

function isBrowser() {
  return typeof window !== 'undefined';
}

function getVapidPublicKey() {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
}

function base64UrlToUint8Array(value: string) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = `${value}${padding}`.replaceAll('-', '+').replaceAll('_', '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

function subscriptionUsesApplicationServerKey(
  subscription: PushSubscription,
  applicationServerKey: Uint8Array,
) {
  const existingKey = subscription.options.applicationServerKey;
  if (!existingKey) return false;

  const existingBytes = new Uint8Array(existingKey);
  return (
    existingBytes.length === applicationServerKey.length &&
    existingBytes.every((byte, index) => byte === applicationServerKey[index])
  );
}

async function getServiceWorkerRegistration() {
  if (!isBrowser() || !('serviceWorker' in navigator)) return null;

  const readyRegistration = await Promise.race<ServiceWorkerRegistration | null>([
    navigator.serviceWorker.ready,
    new Promise((resolve) => window.setTimeout(() => resolve(null), 1500)),
  ]);

  if (readyRegistration) return readyRegistration;
  return navigator.serviceWorker.getRegistration();
}

async function ensureServiceWorkerRegistration() {
  const registration = await getServiceWorkerRegistration();
  if (registration) return registration;

  if (!isBrowser() || !('serviceWorker' in navigator)) return null;

  try {
    return await navigator.serviceWorker.register('/sw.js');
  } catch {
    return null;
  }
}

export function getNotificationSupportState(): NotificationSupportState {
  if (!isBrowser() || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

export async function ensureNotificationPermissions(): Promise<boolean> {
  if (!isBrowser() || !('Notification' in window)) return false;
  if (!window.isSecureContext) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

export async function subscribeToPushNotifications(): Promise<PushSubscriptionInput | null> {
  const isAllowed = await ensureNotificationPermissions();
  if (!isAllowed) return null;

  const vapidPublicKey = getVapidPublicKey();
  if (!vapidPublicKey) return null;

  const registration = await ensureServiceWorkerRegistration();
  if (!registration || !('pushManager' in registration)) return null;

  const applicationServerKey = base64UrlToUint8Array(vapidPublicKey);
  let existingSubscription = await registration.pushManager.getSubscription();

  if (
    existingSubscription &&
    !subscriptionUsesApplicationServerKey(existingSubscription, applicationServerKey)
  ) {
    await existingSubscription.unsubscribe();
    existingSubscription = null;
  }

  const subscription =
    existingSubscription ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    }));
  const json = subscription.toJSON();

  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) return null;

  return {
    endpoint: json.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
    userAgent: navigator.userAgent,
  };
}

export async function unsubscribeFromPushNotifications(): Promise<string | null> {
  const registration = await getServiceWorkerRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return null;

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  return endpoint;
}
