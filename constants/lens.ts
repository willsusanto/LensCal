import type { AppSettings, LensType } from '@/types/lens';

export const LENS_TYPES = ['daily', 'weekly', 'monthly'] as const satisfies readonly LensType[];

export const LENS_TYPE_OPTIONS: { label: string; value: LensType }[] = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
];

export const DEFAULT_SETTINGS: AppSettings = {
  defaultLensType: 'monthly',
  monthlyReplacementDays: 28,
  notificationsEnabled: true,
  reminderHour: 8,
  reminderMinute: 0,
};

export const SETTINGS_LIMITS = {
  monthlyReplacementDays: { min: 1, max: 90 },
  reminderHour: { min: 0, max: 23 },
  reminderMinute: { min: 0, max: 59, step: 5 },
} as const;

export const MAX_NOTE_LENGTH = 1000;

export function isLensType(value: unknown): value is LensType {
  return typeof value === 'string' && LENS_TYPES.includes(value as LensType);
}
