import type { SupabaseClient } from '@supabase/supabase-js';

import { expirationFor } from '@/lib/date-utils';
import type { AppSettings, Eye, LensEvent, LensEventType, LensType, LensUsage } from '@/types/lens';

function createId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

const defaultSettingsDb = {
  default_lens_type: 'monthly',
  monthly_replacement_days: 28,
  notifications_enabled: true,
  reminder_hour: 8,
  reminder_minute: 0,
};

// --- Lens Usages ---

export async function getActiveLenses(supabase: SupabaseClient): Promise<LensUsage[]> {
  const { data, error } = await supabase
    .from('lens_usages')
    .select('*')
    .eq('status', 'active')
    .order('eye', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getLensHistory(supabase: SupabaseClient): Promise<LensUsage[]> {
  const { data, error } = await supabase
    .from('lens_usages')
    .select('*')
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
  const now = nowIso();
  const row = {
    id: createId('lu'),
    user_id: input.userId,
    eye: input.eye,
    opened_at: input.openedAt.toISOString(),
    expires_at: expirationFor(input.openedAt, input.lensType, input.monthlyReplacementDays),
    lens_type: input.lensType,
    status: 'active' as const,
    notes: input.notes,
    created_at: now,
    updated_at: now,
  };
  const { data, error } = await supabase.from('lens_usages').insert(row).select().single();
  if (error) throw error;
  return data;
}

export async function discardActiveLens(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase
    .from('lens_usages')
    .update({ status: 'discarded', updated_at: nowIso() })
    .eq('id', id);
  if (error) throw error;
}

// --- Lens Events ---

export async function getEvents(supabase: SupabaseClient): Promise<LensEvent[]> {
  const { data, error } = await supabase
    .from('lens_events')
    .select('*')
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
  const now = nowIso();
  const row = {
    id: createId('evt'),
    user_id: input.userId,
    lens_usage_id: input.lensUsageId,
    event_type: input.eventType,
    event_at: input.eventAt?.toISOString() ?? now,
    notes: input.notes ?? null,
    created_at: now,
  };
  const { data, error } = await supabase.from('lens_events').insert(row).select().single();
  if (error) throw error;
  return data;
}

// --- Settings ---

export async function getSettings(supabase: SupabaseClient, userId: string): Promise<AppSettings> {
  const { data } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (!data) {
    // First-time user: create default row (upsert handles race conditions).
    await supabase
      .from('user_settings')
      .upsert({ user_id: userId, ...defaultSettingsDb }, { onConflict: 'user_id' });
    return {
      defaultLensType: 'monthly',
      monthlyReplacementDays: 28,
      notificationsEnabled: true,
      reminderHour: 8,
      reminderMinute: 0,
    };
  }

  return {
    defaultLensType: data.default_lens_type,
    monthlyReplacementDays: data.monthly_replacement_days,
    notificationsEnabled: data.notifications_enabled,
    reminderHour: data.reminder_hour,
    reminderMinute: data.reminder_minute,
  };
}

const settingsColumnMap: Record<keyof AppSettings, string> = {
  defaultLensType: 'default_lens_type',
  monthlyReplacementDays: 'monthly_replacement_days',
  notificationsEnabled: 'notifications_enabled',
  reminderHour: 'reminder_hour',
  reminderMinute: 'reminder_minute',
};

export async function updateSetting(
  supabase: SupabaseClient,
  userId: string,
  key: keyof AppSettings,
  value: AppSettings[keyof AppSettings],
): Promise<void> {
  const { error } = await supabase
    .from('user_settings')
    .upsert(
      { user_id: userId, [settingsColumnMap[key]]: value, updated_at: nowIso() },
      { onConflict: 'user_id' },
    );
  if (error) throw error;
}
