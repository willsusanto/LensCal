import * as SQLite from 'expo-sqlite';

import { expirationFor, lensTypeDays, nowIso } from '@/lib/date-utils';
import type { AppSettings, Eye, LensEvent, LensEventType, LensType, LensUsage } from '@/types/lens';

const DATABASE_NAME = 'lenscal.db';

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

function createId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getDatabase() {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync(DATABASE_NAME);
  }

  return databasePromise;
}

export async function initDatabase() {
  const db = await getDatabase();

  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS lens_usages (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT,
      eye TEXT NOT NULL CHECK (eye IN ('left', 'right')),
      opened_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      lens_type TEXT NOT NULL CHECK (lens_type IN ('daily', 'weekly', 'monthly')),
      status TEXT NOT NULL CHECK (status IN ('active', 'discarded')),
      notes TEXT,
      notification_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      dirty INTEGER NOT NULL DEFAULT 1
    );

    CREATE INDEX IF NOT EXISTS lens_usages_eye_status_idx
      ON lens_usages (eye, status, opened_at DESC);

    CREATE TABLE IF NOT EXISTS lens_events (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT,
      lens_usage_id TEXT NOT NULL,
      event_type TEXT NOT NULL CHECK (
        event_type IN ('opened', 'uncomfortable', 'discarded', 'replaced')
      ),
      event_at TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL,
      dirty INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (lens_usage_id) REFERENCES lens_usages (id)
    );

    CREATE INDEX IF NOT EXISTS lens_events_usage_idx
      ON lens_events (lens_usage_id, event_at DESC);

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);

  await ensureSetting('default_lens_type', 'monthly');
  await ensureSetting('monthly_replacement_days', '28');
  await ensureSetting('notifications_enabled', 'true');
  await ensureSetting('reminder_hour', '8');
  await ensureSetting('reminder_minute', '0');
}

async function ensureSetting(key: string, value: string) {
  const db = await getDatabase();
  await db.runAsync('INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)', key, value);
}

export async function getSettings(): Promise<AppSettings> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM app_settings');
  const settings = Object.fromEntries(rows.map((row) => [row.key, row.value]));

  return {
    defaultLensType: (settings.default_lens_type as LensType | undefined) ?? 'monthly',
    monthlyReplacementDays: Number(settings.monthly_replacement_days ?? 28),
    notificationsEnabled: settings.notifications_enabled !== 'false',
    reminderHour: Number(settings.reminder_hour ?? 8),
    reminderMinute: Number(settings.reminder_minute ?? 0),
  };
}

export async function updateSetting(key: keyof AppSettings, value: string | number | boolean) {
  const db = await getDatabase();
  const keyMap: Record<keyof AppSettings, string> = {
    defaultLensType: 'default_lens_type',
    monthlyReplacementDays: 'monthly_replacement_days',
    notificationsEnabled: 'notifications_enabled',
    reminderHour: 'reminder_hour',
    reminderMinute: 'reminder_minute',
  };

  await db.runAsync(
    'INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    keyMap[key],
    String(value),
  );
}

export async function getActiveLenses() {
  const db = await getDatabase();
  return db.getAllAsync<LensUsage>(
    "SELECT * FROM lens_usages WHERE status = 'active' ORDER BY eye ASC, opened_at DESC",
  );
}

export async function getLensHistory() {
  const db = await getDatabase();
  return db.getAllAsync<LensUsage>('SELECT * FROM lens_usages ORDER BY opened_at DESC, updated_at DESC');
}

export async function getEvents() {
  const db = await getDatabase();
  return db.getAllAsync<LensEvent>('SELECT * FROM lens_events ORDER BY event_at DESC');
}

export async function getActiveLensForEye(eye: Eye) {
  const db = await getDatabase();
  return db.getFirstAsync<LensUsage>(
    "SELECT * FROM lens_usages WHERE eye = ? AND status = 'active' ORDER BY opened_at DESC LIMIT 1",
    eye,
  );
}

export async function insertEvent(
  lensUsageId: string,
  eventType: LensEventType,
  notes: string | null = null,
  userId: string | null = null,
) {
  const db = await getDatabase();
  const createdAt = nowIso();
  const event: LensEvent = {
    id: createId('event'),
    user_id: userId,
    lens_usage_id: lensUsageId,
    event_type: eventType,
    event_at: createdAt,
    notes,
    created_at: createdAt,
    dirty: 1,
  };

  await db.runAsync(
    `INSERT INTO lens_events (
      id, user_id, lens_usage_id, event_type, event_at, notes, created_at, dirty
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
    event.id,
    event.user_id,
    event.lens_usage_id,
    event.event_type,
    event.event_at,
    event.notes,
    event.created_at,
  );

  return event;
}

export async function openLens(input: {
  eye: Eye;
  lensType: LensType;
  openedAt?: Date;
  notes?: string | null;
  notificationId?: string | null;
  userId?: string | null;
  monthlyReplacementDays?: number;
}) {
  const db = await getDatabase();
  const openedAt = input.openedAt ?? new Date();
  const createdAt = nowIso();
  const lens: LensUsage = {
    id: createId('lens'),
    user_id: input.userId ?? null,
    eye: input.eye,
    opened_at: openedAt.toISOString(),
    expires_at: expirationFor(openedAt, input.lensType, input.monthlyReplacementDays),
    lens_type: input.lensType,
    status: 'active',
    notes: input.notes ?? null,
    notification_id: input.notificationId ?? null,
    created_at: createdAt,
    updated_at: createdAt,
    dirty: 1,
  };

  await db.runAsync(
    `INSERT INTO lens_usages (
      id, user_id, eye, opened_at, expires_at, lens_type, status, notes,
      notification_id, created_at, updated_at, dirty
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    lens.id,
    lens.user_id,
    lens.eye,
    lens.opened_at,
    lens.expires_at,
    lens.lens_type,
    lens.status,
    lens.notes,
    lens.notification_id,
    lens.created_at,
    lens.updated_at,
  );

  await insertEvent(lens.id, 'opened', input.notes ?? null, lens.user_id);
  return lens;
}

export async function setLensNotificationId(lensUsageId: string, notificationId: string | null) {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE lens_usages SET notification_id = ? WHERE id = ?',
    notificationId,
    lensUsageId,
  );
}

export async function discardLens(lens: LensUsage, eventType: Extract<LensEventType, 'discarded' | 'replaced'>) {
  const db = await getDatabase();
  const updatedAt = nowIso();

  await db.runAsync(
    "UPDATE lens_usages SET status = 'discarded', updated_at = ?, dirty = 1 WHERE id = ?",
    updatedAt,
    lens.id,
  );

  await insertEvent(lens.id, eventType, null, lens.user_id);
}

export async function getDirtyUsages() {
  const db = await getDatabase();
  return db.getAllAsync<LensUsage>('SELECT * FROM lens_usages WHERE dirty = 1');
}

export async function getDirtyEvents() {
  const db = await getDatabase();
  return db.getAllAsync<LensEvent>('SELECT * FROM lens_events WHERE dirty = 1');
}

export async function markUsageClean(id: string, userId: string) {
  const db = await getDatabase();
  await db.runAsync('UPDATE lens_usages SET dirty = 0, user_id = ? WHERE id = ?', userId, id);
}

export async function markEventClean(id: string, userId: string) {
  const db = await getDatabase();
  await db.runAsync('UPDATE lens_events SET dirty = 0, user_id = ? WHERE id = ?', userId, id);
}

export async function upsertRemoteUsage(row: Omit<LensUsage, 'notification_id' | 'dirty'>) {
  const db = await getDatabase();
  const existing = await db.getFirstAsync<LensUsage>('SELECT * FROM lens_usages WHERE id = ?', row.id);
  if (existing?.dirty === 1 && existing.updated_at > row.updated_at) {
    return;
  }

  await db.runAsync(
    `INSERT INTO lens_usages (
      id, user_id, eye, opened_at, expires_at, lens_type, status, notes,
      notification_id, created_at, updated_at, dirty
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, 0)
    ON CONFLICT(id) DO UPDATE SET
      user_id = excluded.user_id,
      eye = excluded.eye,
      opened_at = excluded.opened_at,
      expires_at = excluded.expires_at,
      lens_type = excluded.lens_type,
      status = excluded.status,
      notes = excluded.notes,
      created_at = excluded.created_at,
      updated_at = excluded.updated_at,
      dirty = 0`,
    row.id,
    row.user_id,
    row.eye,
    row.opened_at,
    row.expires_at,
    row.lens_type,
    row.status,
    row.notes,
    row.created_at,
    row.updated_at,
  );
}

export async function upsertRemoteEvent(row: Omit<LensEvent, 'dirty'>) {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO lens_events (
      id, user_id, lens_usage_id, event_type, event_at, notes, created_at, dirty
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    ON CONFLICT(id) DO UPDATE SET
      user_id = excluded.user_id,
      lens_usage_id = excluded.lens_usage_id,
      event_type = excluded.event_type,
      event_at = excluded.event_at,
      notes = excluded.notes,
      created_at = excluded.created_at,
      dirty = CASE WHEN lens_events.dirty = 1 THEN 1 ELSE 0 END`,
    row.id,
    row.user_id,
    row.lens_usage_id,
    row.event_type,
    row.event_at,
    row.notes,
    row.created_at,
  );
}

export function expectedDaysFor(lensType: LensType) {
  return lensTypeDays[lensType];
}
