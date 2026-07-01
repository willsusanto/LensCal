import type { AppSettings, LensType, NotificationReminder } from '@/types/lens';

export const LENS_TYPES = ['daily', 'weekly', 'monthly'] as const satisfies readonly LensType[];

export const LENS_TYPE_OPTIONS: { label: string; value: LensType }[] = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
];

export const MAX_NOTIFICATION_REMINDERS = 3;

export const DEFAULT_NOTIFICATION_REMINDERS: NotificationReminder[] = [
  { daysBefore: 0, hour: 8, minute: 0 },
];

export const DEFAULT_SETTINGS: AppSettings = {
  defaultLensType: 'monthly',
  monthlyReplacementDays: 28,
  notificationsEnabled: true,
  notificationReminders: DEFAULT_NOTIFICATION_REMINDERS,
};

export const SETTINGS_LIMITS = {
  monthlyReplacementDays: { min: 1, max: 90 },
  reminderDaysBefore: { min: 0, max: 90 },
  reminderHour: { min: 0, max: 23 },
  reminderMinute: { min: 0, max: 59, step: 5 },
} as const;

export const MAX_NOTE_LENGTH = 1000;

export function isLensType(value: unknown): value is LensType {
  return typeof value === 'string' && LENS_TYPES.includes(value as LensType);
}

function isIntegerInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}

function reminderKey(reminder: NotificationReminder) {
  return `${reminder.daysBefore}:${reminder.hour}:${reminder.minute}`;
}

function parseNotificationReminder(value: unknown): NotificationReminder | null {
  if (!value || typeof value !== 'object') return null;

  const reminder = value as Record<string, unknown>;
  if (
    !isIntegerInRange(
      reminder.daysBefore,
      SETTINGS_LIMITS.reminderDaysBefore.min,
      SETTINGS_LIMITS.reminderDaysBefore.max,
    ) ||
    !isIntegerInRange(reminder.hour, SETTINGS_LIMITS.reminderHour.min, SETTINGS_LIMITS.reminderHour.max) ||
    !isIntegerInRange(
      reminder.minute,
      SETTINGS_LIMITS.reminderMinute.min,
      SETTINGS_LIMITS.reminderMinute.max,
    )
  ) {
    return null;
  }

  return {
    daysBefore: reminder.daysBefore,
    hour: reminder.hour,
    minute: reminder.minute,
  };
}

export function normalizeNotificationReminders(
  value: unknown,
  fallback: NotificationReminder[] = DEFAULT_NOTIFICATION_REMINDERS,
) {
  if (!Array.isArray(value)) return fallback.map((reminder) => ({ ...reminder }));

  const seen = new Set<string>();
  const reminders: NotificationReminder[] = [];

  for (const entry of value) {
    const reminder = parseNotificationReminder(entry);
    if (!reminder) continue;

    const key = reminderKey(reminder);
    if (seen.has(key)) continue;

    seen.add(key);
    reminders.push(reminder);

    if (reminders.length >= MAX_NOTIFICATION_REMINDERS) break;
  }

  return reminders;
}

export function validateNotificationReminders(value: unknown) {
  if (!Array.isArray(value)) {
    throw new RangeError('Notification reminders must be an array.');
  }

  const seen = new Set<string>();
  const reminders: NotificationReminder[] = [];

  for (const entry of value) {
    const reminder = parseNotificationReminder(entry);
    if (!reminder) {
      throw new RangeError('Notification reminders contain invalid values.');
    }

    const key = reminderKey(reminder);
    if (seen.has(key)) continue;

    seen.add(key);
    reminders.push(reminder);
  }

  if (reminders.length > MAX_NOTIFICATION_REMINDERS) {
    throw new RangeError(`Notification reminders are limited to ${MAX_NOTIFICATION_REMINDERS}.`);
  }

  return reminders;
}
