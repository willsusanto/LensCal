import type { LensType, NotificationReminder } from '@/types/lens';

export const lensTypeDays: Record<LensType, number> = {
  daily: 1,
  weekly: 7,
  monthly: 28,
};

export function nowIso() {
  return new Date().toISOString();
}

export function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function replacementDaysFor(lensType: LensType, monthlyReplacementDays = lensTypeDays.monthly) {
  return lensType === 'monthly' ? monthlyReplacementDays : lensTypeDays[lensType];
}

export function expirationFor(openedAt: Date, lensType: LensType, monthlyReplacementDays = lensTypeDays.monthly) {
  return addDays(startOfLocalDay(openedAt), replacementDaysFor(lensType, monthlyReplacementDays)).toISOString();
}

export function daysUsed(openedAt: string, at = new Date()) {
  const opened = startOfLocalDay(new Date(openedAt));
  const today = startOfLocalDay(at);
  const diff = today.getTime() - opened.getTime();
  return Math.max(1, Math.floor(diff / 86_400_000) + 1);
}

export function daysRemaining(expiresAt: string, at = new Date()) {
  const expires = startOfLocalDay(new Date(expiresAt));
  const today = startOfLocalDay(at);
  return Math.ceil((expires.getTime() - today.getTime()) / 86_400_000);
}

export function formatShortDate(value: string | Date) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(typeof value === 'string' ? new Date(value) : value);
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export function formatReminderTime(hour: number, minute: number) {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function formatNotificationReminder(reminder: NotificationReminder) {
  return `${reminder.daysBefore} ${reminder.daysBefore === 1 ? 'day' : 'days'} before at ${formatReminderTime(
    reminder.hour,
    reminder.minute,
  )}`;
}

export function displayLensType(lensType: LensType) {
  return lensType.charAt(0).toUpperCase() + lensType.slice(1);
}

export function expectedDaysFor(lensType: LensType) {
  return lensTypeDays[lensType];
}

export function lensDurationDays(openedAt: string, expiresAt: string) {
  const opened = startOfLocalDay(new Date(openedAt));
  const expires = startOfLocalDay(new Date(expiresAt));
  return Math.max(1, Math.round((expires.getTime() - opened.getTime()) / 86_400_000));
}
