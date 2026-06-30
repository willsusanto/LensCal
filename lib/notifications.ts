// Notifications are deferred — Web Push API implementation comes in a later step.
// These stubs keep the build passing.
import type { AppSettings, LensUsage } from '@/types/lens';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function ensureNotificationPermissions(_lens?: LensUsage, _settings?: AppSettings): Promise<boolean> {
  return false;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function cancelLensNotification(_notificationId: string | null): Promise<void> {
  // no-op
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function scheduleReplacementNotification(_lens: LensUsage, _settings: AppSettings): Promise<string | null> {
  return null;
}

