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
  created_at: string;
  updated_at: string;
};

export type LensEvent = {
  id: string;
  user_id: string | null;
  lens_usage_id: string;
  event_type: LensEventType;
  event_at: string;
  notes: string | null;
  created_at: string;
};

export type NotificationReminder = {
  daysBefore: number;
  hour: number;
  minute: number;
};

export type AppSettings = {
  defaultLensType: LensType;
  monthlyReplacementDays: number;
  notificationsEnabled: boolean;
  notificationReminders: NotificationReminder[];
};

export type PushSubscriptionInput = {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string | null;
};

export type EyeState = {
  eye: Eye;
  activeLens: LensUsage | null;
  latestUncomfortableEvent: LensEvent | null;
};
