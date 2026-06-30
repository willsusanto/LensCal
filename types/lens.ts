export type Eye = 'left' | 'right';

export type LensType = 'daily' | 'weekly' | 'monthly';

export type LensStatus = 'active' | 'discarded';

export type LensEventType = 'opened' | 'uncomfortable' | 'discarded' | 'replaced';

export type LensUsage = {
  id: string;
  user_id: string | null;
  eye: Eye;
  opened_at: string;
  expires_at: string;
  lens_type: LensType;
  status: LensStatus;
  notes: string | null;
  notification_id: string | null;
  created_at: string;
  updated_at: string;
  dirty: number;
};

export type LensEvent = {
  id: string;
  user_id: string | null;
  lens_usage_id: string;
  event_type: LensEventType;
  event_at: string;
  notes: string | null;
  created_at: string;
  dirty: number;
};

export type AppSettings = {
  defaultLensType: LensType;
  monthlyReplacementDays: number;
  notificationsEnabled: boolean;
  reminderHour: number;
  reminderMinute: number;
};

export type EyeState = {
  eye: Eye;
  activeLens: LensUsage | null;
  latestUncomfortableEvent: LensEvent | null;
};
