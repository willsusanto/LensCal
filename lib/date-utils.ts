import type { LensType } from '@/types/lens';

export const lensTypeDays: Record<LensType, number> = {
  daily: 1,
  weekly: 7,
  monthly: 30,
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

export function expirationFor(openedAt: Date, lensType: LensType) {
  return addDays(startOfLocalDay(openedAt), lensTypeDays[lensType]).toISOString();
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

export function displayLensType(lensType: LensType) {
  return lensType.charAt(0).toUpperCase() + lensType.slice(1);
}

export function expectedDaysFor(lensType: LensType) {
  return lensTypeDays[lensType];
}
