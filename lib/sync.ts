import type { SupabaseClient } from '@supabase/supabase-js';

import {
  getDirtyEvents,
  getDirtyUsages,
  markEventClean,
  markUsageClean,
  upsertRemoteEvent,
  upsertRemoteUsage,
} from '@/lib/local-db';
import type { LensEvent, LensUsage } from '@/types/lens';

type RemoteUsage = Omit<LensUsage, 'notification_id' | 'dirty'>;
type RemoteEvent = Omit<LensEvent, 'dirty'>;

function remoteUsageFromLocal(row: LensUsage, userId: string): RemoteUsage {
  return {
    id: row.id,
    user_id: userId,
    eye: row.eye,
    opened_at: row.opened_at,
    expires_at: row.expires_at,
    lens_type: row.lens_type,
    status: row.status,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function remoteEventFromLocal(row: LensEvent, userId: string): RemoteEvent {
  return {
    id: row.id,
    user_id: userId,
    lens_usage_id: row.lens_usage_id,
    event_type: row.event_type,
    event_at: row.event_at,
    notes: row.notes,
    created_at: row.created_at,
  };
}

export async function syncWithSupabase(client: SupabaseClient, userId: string) {
  const dirtyUsages = await getDirtyUsages();
  const dirtyEvents = await getDirtyEvents();

  for (const usage of dirtyUsages) {
    const payload = remoteUsageFromLocal(usage, userId);
    const { error } = await client.from('lens_usages').upsert(payload);
    if (error) {
      throw error;
    }
    await markUsageClean(usage.id, userId);
  }

  for (const event of dirtyEvents) {
    const payload = remoteEventFromLocal(event, userId);
    const { error } = await client.from('lens_events').upsert(payload);
    if (error) {
      throw error;
    }
    await markEventClean(event.id, userId);
  }

  const { data: remoteUsages, error: usageError } = await client
    .from('lens_usages')
    .select('*')
    .eq('user_id', userId)
    .order('opened_at', { ascending: false });

  if (usageError) {
    throw usageError;
  }

  for (const usage of (remoteUsages ?? []) as RemoteUsage[]) {
    await upsertRemoteUsage(usage);
  }

  const { data: remoteEvents, error: eventError } = await client
    .from('lens_events')
    .select('*')
    .eq('user_id', userId)
    .order('event_at', { ascending: false });

  if (eventError) {
    throw eventError;
  }

  for (const event of (remoteEvents ?? []) as RemoteEvent[]) {
    await upsertRemoteEvent(event);
  }

  return {
    pushedUsages: dirtyUsages.length,
    pushedEvents: dirtyEvents.length,
    pulledUsages: remoteUsages?.length ?? 0,
    pulledEvents: remoteEvents?.length ?? 0,
  };
}
