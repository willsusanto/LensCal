import type { SupabaseClient } from '@supabase/supabase-js';

import {
  DEFAULT_NOTIFICATION_REMINDERS,
  DEFAULT_SETTINGS,
  MAX_NOTE_LENGTH,
  SETTINGS_LIMITS,
  isLensType,
  normalizeNotificationReminders,
  validateNotificationReminders,
} from '@/constants/lens';
import { expirationFor } from '@/lib/date-utils';
import type { AppSettings, Eye, LensEvent, LensEventType, LensType, LensUsage } from '@/types/lens';

function createId(prefix: string): string {
  const cryptoApi = globalThis.crypto;

  if (!cryptoApi) {
    throw new Error('Secure random ID generation is unavailable.');
  }

  if (typeof cryptoApi.randomUUID === 'function') {
    return `${prefix}_${cryptoApi.randomUUID().replaceAll('-', '')}`;
  }

  if (typeof cryptoApi.getRandomValues === 'function') {
    const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
    const random = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    return `${prefix}_${random}`;
  }

  throw new Error('Secure random ID generation is unavailable.');
}

function nowIso(): string {
  return new Date().toISOString();
}

const defaultSettingsDb = {
  default_lens_type: DEFAULT_SETTINGS.defaultLensType,
  monthly_replacement_days: DEFAULT_SETTINGS.monthlyReplacementDays,
  notifications_enabled: DEFAULT_SETTINGS.notificationsEnabled,
  reminder_hour: DEFAULT_NOTIFICATION_REMINDERS[0].hour,
  reminder_minute: DEFAULT_NOTIFICATION_REMINDERS[0].minute,
  notification_reminders: DEFAULT_SETTINGS.notificationReminders,
};

function assertValidDate(value: Date, label: string) {
  if (Number.isNaN(value.getTime())) {
    throw new RangeError(`${label} must be a valid date.`);
  }
}

function normalizeNotes(notes: string | null | undefined) {
  const trimmed = notes?.trim() ?? '';
  if (!trimmed) return null;
  if (trimmed.length > MAX_NOTE_LENGTH) {
    throw new RangeError(`Notes must be ${MAX_NOTE_LENGTH} characters or fewer.`);
  }
  return trimmed;
}

function normalizeSettingsRow(data: Record<string, unknown>): AppSettings {
  const defaultLensType = isLensType(data.default_lens_type)
    ? data.default_lens_type
    : DEFAULT_SETTINGS.defaultLensType;
  const monthlyReplacementDays =
    typeof data.monthly_replacement_days === 'number'
      ? Math.min(
          SETTINGS_LIMITS.monthlyReplacementDays.max,
          Math.max(SETTINGS_LIMITS.monthlyReplacementDays.min, data.monthly_replacement_days),
        )
      : DEFAULT_SETTINGS.monthlyReplacementDays;
  const reminderHour =
    typeof data.reminder_hour === 'number'
      ? Math.min(SETTINGS_LIMITS.reminderHour.max, Math.max(SETTINGS_LIMITS.reminderHour.min, data.reminder_hour))
      : DEFAULT_NOTIFICATION_REMINDERS[0].hour;
  const reminderMinute =
    typeof data.reminder_minute === 'number'
      ? Math.min(
          SETTINGS_LIMITS.reminderMinute.max,
          Math.max(SETTINGS_LIMITS.reminderMinute.min, data.reminder_minute),
        )
      : DEFAULT_NOTIFICATION_REMINDERS[0].minute;
  const fallbackReminder = [{ daysBefore: 0, hour: reminderHour, minute: reminderMinute }];

  return {
    defaultLensType,
    monthlyReplacementDays,
    notificationsEnabled:
      typeof data.notifications_enabled === 'boolean'
        ? data.notifications_enabled
        : DEFAULT_SETTINGS.notificationsEnabled,
    notificationReminders: normalizeNotificationReminders(data.notification_reminders, fallbackReminder),
  };
}

function validateSettingValue<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
  switch (key) {
    case 'defaultLensType':
      if (!isLensType(value)) throw new RangeError('Default lens type is invalid.');
      return value;
    case 'monthlyReplacementDays':
      if (
        typeof value !== 'number' ||
        !Number.isInteger(value) ||
        value < SETTINGS_LIMITS.monthlyReplacementDays.min ||
        value > SETTINGS_LIMITS.monthlyReplacementDays.max
      ) {
        throw new RangeError('Monthly replacement days are outside the allowed range.');
      }
      return value;
    case 'notificationsEnabled':
      if (typeof value !== 'boolean') throw new RangeError('Notifications setting must be a boolean.');
      return value;
    case 'notificationReminders':
      return validateNotificationReminders(value);
  }
}

function assertValidMonthlyReplacementDays(value: number) {
  if (
    !Number.isInteger(value) ||
    value < SETTINGS_LIMITS.monthlyReplacementDays.min ||
    value > SETTINGS_LIMITS.monthlyReplacementDays.max
  ) {
    throw new RangeError('Monthly replacement days are outside the allowed range.');
  }
}

export function validateOpenLensInput(input: {
  lensType: LensType;
  openedAt: Date;
  notes: string | null;
  monthlyReplacementDays: number;
}) {
  assertValidDate(input.openedAt, 'Opened date');
  if (!isLensType(input.lensType)) throw new RangeError('Lens type is invalid.');
  assertValidMonthlyReplacementDays(input.monthlyReplacementDays);

  return {
    notes: normalizeNotes(input.notes),
  };
}

// --- Lens Usages ---

export async function getActiveLenses(supabase: SupabaseClient, userId: string): Promise<LensUsage[]> {
  const { data, error } = await supabase
    .from('lens_usages')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('eye', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getActiveLensForEye(
  supabase: SupabaseClient,
  userId: string,
  eye: Eye,
): Promise<LensUsage | null> {
  const { data, error } = await supabase
    .from('lens_usages')
    .select('*')
    .eq('user_id', userId)
    .eq('eye', eye)
    .eq('status', 'active')
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getLensHistory(supabase: SupabaseClient, userId: string): Promise<LensUsage[]> {
  const { data, error } = await supabase
    .from('lens_usages')
    .select('*')
    .eq('user_id', userId)
    .order('opened_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function openLens(
  supabase: SupabaseClient,
  input: {
    userId: string;
    eye: Eye;
    lensType: LensType;
    openedAt: Date;
    notes: string | null;
    monthlyReplacementDays: number;
  },
): Promise<LensUsage> {
  const { notes } = validateOpenLensInput(input);

  const now = nowIso();
  const row = {
    id: createId('lu'),
    user_id: input.userId,
    eye: input.eye,
    opened_at: input.openedAt.toISOString(),
    expires_at: expirationFor(input.openedAt, input.lensType, input.monthlyReplacementDays),
    lens_type: input.lensType,
    status: 'active' as const,
    notes,
    created_at: now,
    updated_at: now,
  };
  const { data, error } = await supabase.from('lens_usages').insert(row).select().single();
  if (error) throw error;
  return data;
}

export async function discardActiveLens(supabase: SupabaseClient, userId: string, id: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('lens_usages')
    .update({ status: 'discarded', updated_at: nowIso() })
    .eq('user_id', userId)
    .eq('id', id)
    .eq('status', 'active')
    .select('id')
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function updateLensUsageDates(
  supabase: SupabaseClient,
  input: {
    userId: string;
    lensUsageId: string;
    openedAt: Date;
    terminalEventId?: string | null;
    terminalEventAt?: Date | null;
    monthlyReplacementDays: number;
  },
): Promise<LensUsage> {
  assertValidDate(input.openedAt, 'Opened date');
  assertValidMonthlyReplacementDays(input.monthlyReplacementDays);

  if (input.terminalEventAt) {
    assertValidDate(input.terminalEventAt, 'End date');
    if (input.terminalEventAt.getTime() < input.openedAt.getTime()) {
      throw new RangeError('End date cannot be before the opened date.');
    }
  }

  const { data: current, error: readError } = await supabase
    .from('lens_usages')
    .select('*')
    .eq('user_id', input.userId)
    .eq('id', input.lensUsageId)
    .single();
  if (readError) throw readError;
  if (!current || !isLensType(current.lens_type)) {
    throw new Error('Lens record could not be found.');
  }

  const { data: updatedUsage, error: updateError } = await supabase
    .from('lens_usages')
    .update({
      opened_at: input.openedAt.toISOString(),
      expires_at: expirationFor(input.openedAt, current.lens_type, input.monthlyReplacementDays),
      updated_at: current.status === 'discarded' && !input.terminalEventId ? current.updated_at : nowIso(),
    })
    .eq('user_id', input.userId)
    .eq('id', input.lensUsageId)
    .select()
    .single();
  if (updateError) throw updateError;

  const { error: openedEventError } = await supabase
    .from('lens_events')
    .update({ event_at: input.openedAt.toISOString() })
    .eq('user_id', input.userId)
    .eq('lens_usage_id', input.lensUsageId)
    .eq('event_type', 'opened');
  if (openedEventError) throw openedEventError;

  if (input.terminalEventId && input.terminalEventAt) {
    const { error: terminalEventError } = await supabase
      .from('lens_events')
      .update({ event_at: input.terminalEventAt.toISOString() })
      .eq('user_id', input.userId)
      .eq('lens_usage_id', input.lensUsageId)
      .eq('id', input.terminalEventId)
      .in('event_type', ['discarded', 'replaced']);
    if (terminalEventError) throw terminalEventError;
  }

  return updatedUsage;
}

// --- Lens Events ---

export async function getEvents(supabase: SupabaseClient, userId: string): Promise<LensEvent[]> {
  const { data, error } = await supabase
    .from('lens_events')
    .select('*')
    .eq('user_id', userId)
    .order('event_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function insertEvent(
  supabase: SupabaseClient,
  input: {
    userId: string;
    lensUsageId: string;
    eventType: LensEventType;
    eventAt?: Date;
    notes?: string | null;
  },
): Promise<LensEvent> {
  if (input.eventAt) assertValidDate(input.eventAt, 'Event date');

  const now = nowIso();
  const row = {
    id: createId('evt'),
    user_id: input.userId,
    lens_usage_id: input.lensUsageId,
    event_type: input.eventType,
    event_at: input.eventAt?.toISOString() ?? now,
    notes: normalizeNotes(input.notes),
    created_at: now,
  };
  const { data, error } = await supabase.from('lens_events').insert(row).select().single();
  if (error) throw error;
  return data;
}

// --- Settings ---

export async function getSettings(supabase: SupabaseClient, userId: string): Promise<AppSettings> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    // First-time user: create default row (upsert handles race conditions).
    await supabase
      .from('user_settings')
      .upsert({ user_id: userId, ...defaultSettingsDb }, { onConflict: 'user_id' });
    return DEFAULT_SETTINGS;
  }

  return normalizeSettingsRow(data);
}

const settingsColumnMap: Record<keyof AppSettings, string> = {
  defaultLensType: 'default_lens_type',
  monthlyReplacementDays: 'monthly_replacement_days',
  notificationsEnabled: 'notifications_enabled',
  notificationReminders: 'notification_reminders',
};

export async function updateSetting(
  supabase: SupabaseClient,
  userId: string,
  key: keyof AppSettings,
  value: AppSettings[keyof AppSettings],
): Promise<void> {
  const validatedValue = validateSettingValue(key, value);

  const { error } = await supabase
    .from('user_settings')
    .upsert(
      { user_id: userId, [settingsColumnMap[key]]: validatedValue, updated_at: nowIso() },
      { onConflict: 'user_id' },
    );
  if (error) throw error;
}
