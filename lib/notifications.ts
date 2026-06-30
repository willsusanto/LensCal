import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { formatShortDate } from '@/lib/date-utils';
import type { AppSettings, Eye, LensUsage } from '@/types/lens';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const CHANNEL_ID = 'lens-replacements';

export async function ensureNotificationPermissions() {
  if (process.env.EXPO_OS === 'web') {
    return false;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Lens replacement reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const current = await Notifications.getPermissionsAsync();
  if (current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted || requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

export async function cancelLensNotification(notificationId: string | null) {
  if (!notificationId || process.env.EXPO_OS === 'web') {
    return;
  }

  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

export async function scheduleReplacementNotification(lens: LensUsage, settings: AppSettings) {
  if (!settings.notificationsEnabled || process.env.EXPO_OS === 'web') {
    return null;
  }

  const granted = await ensureNotificationPermissions();
  if (!granted) {
    return null;
  }

  const triggerDate = new Date(lens.expires_at);
  triggerDate.setHours(settings.reminderHour, settings.reminderMinute, 0, 0);

  if (triggerDate.getTime() <= Date.now()) {
    return null;
  }

  const eyeLabel = lens.eye === 'left' ? 'Left' : 'Right';

  return Notifications.scheduleNotificationAsync({
    content: {
      title: `${eyeLabel} lens replacement`,
      body: `Replace your ${lens.eye} lens by ${formatShortDate(lens.expires_at)}.`,
      data: {
        eye: lens.eye satisfies Eye,
        lensUsageId: lens.id,
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
      channelId: CHANNEL_ID,
    },
  });
}
