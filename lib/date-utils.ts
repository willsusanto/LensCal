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

export function toLocalDateKey(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export interface CalendarDayCell {
  date: Date;
  dateKey: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
}

export function getCalendarDaysForMonth(year: number, month: number): CalendarDayCell[] {
  const todayKey = toLocalDateKey(new Date());
  const firstDayOfMonth = new Date(year, month, 1);
  const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun, 1 = Mon...
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: CalendarDayCell[] = [];

  // Padding days from previous month
  const prevMonthDays = new Date(year, month, 0).getDate();
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const dayNum = prevMonthDays - i;
    const date = new Date(year, month - 1, dayNum);
    const dateKey = toLocalDateKey(date);
    cells.push({
      date,
      dateKey,
      dayNumber: dayNum,
      isCurrentMonth: false,
      isToday: dateKey === todayKey,
    });
  }

  // Days in current month
  for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
    const date = new Date(year, month, dayNum);
    const dateKey = toLocalDateKey(date);
    cells.push({
      date,
      dateKey,
      dayNumber: dayNum,
      isCurrentMonth: true,
      isToday: dateKey === todayKey,
    });
  }

  // Padding days for next month to complete the week row (total cells multiple of 7)
  const remainingCells = 7 - (cells.length % 7);
  if (remainingCells < 7) {
    for (let dayNum = 1; dayNum <= remainingCells; dayNum++) {
      const date = new Date(year, month + 1, dayNum);
      const dateKey = toLocalDateKey(date);
      cells.push({
        date,
        dateKey,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dateKey === todayKey,
      });
    }
  }

  return cells;
}

export function formatMonthYear(year: number, month: number): string {
  const date = new Date(year, month, 1);
  return new Intl.DateTimeFormat(undefined, {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

