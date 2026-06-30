import * as Haptics from 'expo-haptics';

export async function lightTap() {
  if (process.env.EXPO_OS !== 'ios') {
    return;
  }

  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

export async function warningTap() {
  if (process.env.EXPO_OS !== 'ios') {
    return;
  }

  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
}
