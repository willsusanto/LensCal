// Notifications are deferred — Web Push implementation comes in a later step.
/* eslint-disable @typescript-eslint/no-unused-vars */
import type { AppSettings, LensUsage } from '@/types/lens';

export async function ensureNotificationPermissions(): Promise<boolean> {
  return false;
}

export async function cancelLensNotification(
  _notificationId: string | null,
): Promise<void> {}

export async function scheduleReplacementNotification(
  _lens: LensUsage,
  _settings: AppSettings,
): Promise<string | null> {
  return null;
}
/* eslint-enable @typescript-eslint/no-unused-vars */
