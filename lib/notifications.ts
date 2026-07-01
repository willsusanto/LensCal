import type { AppSettings, LensUsage } from '@/types/lens';
import type { NotificationReminder } from '@/types/lens';
import type { PushSubscriptionInput } from '@/types/lens';

export type NotificationSupportState =
  | 'unsupported'
  | 'default'
  | 'granted'
  | 'denied';

const reminderTimers = new Map<string, ReturnType<typeof setTimeout>>();
const maxTimeoutDelay = 2_147_483_647;

type LensNotificationOptions = NotificationOptions & {
  renotify?: boolean;
};

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

function reminderDateFor(lens: LensUsage, reminder: NotificationReminder) {
  const reminderAt = new Date(lens.expires_at);
  reminderAt.setDate(reminderAt.getDate() - reminder.daysBefore);
  reminderAt.setHours(reminder.hour, reminder.minute, 0, 0);
  return reminderAt;
}

function reminderNotificationId(lens: LensUsage, reminder: NotificationReminder) {
  return `${lens.id}:${reminder.daysBefore}:${reminder.hour}:${reminder.minute}`;
}

function reminderStorageKey(lens: LensUsage, reminder: NotificationReminder) {
  const reminderAt = reminderDateFor(lens, reminder).toISOString();
  return `lenscal:reminder-sent:${lens.id}:${reminderAt}`;
}

function wasReminderSent(lens: LensUsage, reminder: NotificationReminder) {
  if (!isBrowser()) return false;
  return window.localStorage.getItem(reminderStorageKey(lens, reminder)) === '1';
}

function markReminderSent(lens: LensUsage, reminder: NotificationReminder) {
  if (!isBrowser()) return;
  window.localStorage.setItem(reminderStorageKey(lens, reminder), '1');
}

function duePhrase(daysBefore: number) {
  if (daysBefore === 0) return 'today';
  if (daysBefore === 1) return 'tomorrow';
  return `in ${daysBefore} days`;
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

async function showBrowserNotification(title: string, options: LensNotificationOptions) {
  if (!isBrowser() || !('Notification' in window) || Notification.permission !== 'granted') {
    return false;
  }

  const registration = await getServiceWorkerRegistration();
  if (registration?.showNotification) {
    await registration.showNotification(title, options);
    return true;
  }

  new Notification(title, options);
  return true;
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

export async function cancelLensNotification(
  notificationId: string | null,
): Promise<void> {
  if (!notificationId) return;

  for (const [timerId, timer] of reminderTimers) {
    if (timerId !== notificationId && !timerId.startsWith(`${notificationId}:`)) continue;

    clearTimeout(timer);
    reminderTimers.delete(timerId);
  }

  const registration = await getServiceWorkerRegistration();
  const notifications = await registration?.getNotifications();
  notifications
    ?.filter((notification) => notification.tag === notificationId || notification.tag.startsWith(`${notificationId}:`))
    .forEach((notification) => notification.close());
}

export async function showTestNotification(): Promise<boolean> {
  const isAllowed = await ensureNotificationPermissions();
  if (!isAllowed) return false;

  return showBrowserNotification('LensCal reminders are ready', {
    body: 'This is a test notification from LensCal.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'lenscal-test-notification',
    renotify: true,
  });
}

export async function scheduleReplacementNotification(
  lens: LensUsage,
  settings: AppSettings,
): Promise<string | null> {
  if (!settings.notificationsEnabled) return null;
  if (getNotificationSupportState() !== 'granted') return null;

  await cancelLensNotification(lens.id);

  if (settings.notificationReminders.length === 0) return null;

  for (const reminder of settings.notificationReminders) {
    const notificationId = reminderNotificationId(lens, reminder);
    const reminderAt = reminderDateFor(lens, reminder);
    const showReminder = async () => {
      if (wasReminderSent(lens, reminder)) return;

      const didShow = await showBrowserNotification('Time to replace your lens', {
        body: `Your ${lens.eye} ${lens.lens_type} lens is due for replacement ${duePhrase(
          reminder.daysBefore,
        )}.`,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: notificationId,
        renotify: true,
        data: { url: '/' },
      });

      if (didShow) markReminderSent(lens, reminder);
    };

    const schedule = () => {
      const delay = reminderAt.getTime() - Date.now();

      if (delay <= 0) {
        reminderTimers.delete(notificationId);
        void showReminder();
        return;
      }

      const timer = setTimeout(schedule, Math.min(delay, maxTimeoutDelay));
      reminderTimers.set(notificationId, timer);
    };

    schedule();
  }

  return lens.id;
}

export async function subscribeToPushNotifications(): Promise<PushSubscriptionInput | null> {
  const isAllowed = await ensureNotificationPermissions();
  if (!isAllowed) return null;

  const vapidPublicKey = getVapidPublicKey();
  if (!vapidPublicKey) return null;

  const registration = await ensureServiceWorkerRegistration();
  if (!registration || !('pushManager' in registration)) return null;

  const existingSubscription = await registration.pushManager.getSubscription();
  const subscription =
    existingSubscription ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToUint8Array(vapidPublicKey),
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
