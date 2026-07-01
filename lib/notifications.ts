import type { AppSettings, LensUsage } from '@/types/lens';

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

function reminderDateFor(lens: LensUsage, settings: AppSettings) {
  const reminderAt = new Date(lens.expires_at);
  reminderAt.setHours(settings.reminderHour, settings.reminderMinute, 0, 0);
  return reminderAt;
}

function reminderStorageKey(lens: LensUsage, settings: AppSettings) {
  const reminderAt = reminderDateFor(lens, settings).toISOString();
  return `lenscal:reminder-sent:${lens.id}:${reminderAt}`;
}

function wasReminderSent(lens: LensUsage, settings: AppSettings) {
  if (!isBrowser()) return false;
  return window.localStorage.getItem(reminderStorageKey(lens, settings)) === '1';
}

function markReminderSent(lens: LensUsage, settings: AppSettings) {
  if (!isBrowser()) return;
  window.localStorage.setItem(reminderStorageKey(lens, settings), '1');
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

  const timer = reminderTimers.get(notificationId);
  if (timer) {
    clearTimeout(timer);
    reminderTimers.delete(notificationId);
  }

  const registration = await getServiceWorkerRegistration();
  const notifications = await registration?.getNotifications({ tag: notificationId });
  notifications?.forEach((notification) => notification.close());
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

  const reminderAt = reminderDateFor(lens, settings);
  const showReminder = async () => {
    if (wasReminderSent(lens, settings)) return;

    const didShow = await showBrowserNotification('Time to replace your lens', {
      body: `Your ${lens.eye} ${lens.lens_type} lens is due for replacement.`,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: lens.id,
      renotify: true,
      data: { url: '/' },
    });

    if (didShow) markReminderSent(lens, settings);
  };

  const schedule = () => {
    const delay = reminderAt.getTime() - Date.now();

    if (delay <= 0) {
      void showReminder();
      return;
    }

    const timer = setTimeout(schedule, Math.min(delay, maxTimeoutDelay));
    reminderTimers.set(lens.id, timer);
  };

  schedule();
  return lens.id;
}
