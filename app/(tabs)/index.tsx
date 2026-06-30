import { Alert, ScrollView, Text, useWindowDimensions, View } from 'react-native';

import { LensCard } from '@/components/lens-card';
import { palette } from '@/constants/palette';
import { formatReminderTime } from '@/lib/date-utils';
import { lightTap, warningTap } from '@/lib/haptics';
import { useLens } from '@/providers/lens-provider';
import type { Eye } from '@/types/lens';

export default function TodayScreen() {
  const { eyes, isBusy, isReady, markUncomfortable, discardLens, settings, syncMessage } = useLens();
  const { width } = useWindowDimensions();
  const compact = width < 390;
  const panelGap = compact ? 8 : 10;

  async function handleMarkUncomfortable(eye: Eye) {
    await lightTap();
    await markUncomfortable(eye);
  }

  async function handleDiscard(eye: Eye) {
    await warningTap();
    const label = eye === 'left' ? 'left' : 'right';

    Alert.alert(`Discard ${label} lens?`, 'This ends the active lens without opening a replacement.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => {
          discardLens(eye);
        },
      },
    ]);
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: palette.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: 112, gap: 16 }}>
      <View style={{ gap: 4 }}>
        <Text selectable style={{ color: palette.ink, fontSize: compact ? 30 : 34, fontWeight: '900' }}>
          Today
        </Text>
        <Text selectable style={{ color: palette.muted, fontSize: compact ? 14 : 15 }}>
          Replacement reminders at {formatReminderTime(settings.reminderHour, settings.reminderMinute)}
        </Text>
      </View>

      {!isReady ? (
        <Text selectable style={{ color: palette.muted, fontSize: 16 }}>
          Loading lenses...
        </Text>
      ) : (
        <View
          style={{
            width: '100%',
            maxWidth: 520,
            alignSelf: 'center',
            flexDirection: 'row',
            alignItems: 'stretch',
            gap: panelGap,
          }}>
          <LensCard
            state={eyes.left}
            disabled={isBusy}
            compact={compact}
            onDiscard={handleDiscard}
            onMarkUncomfortable={handleMarkUncomfortable}
          />
          <LensCard
            state={eyes.right}
            disabled={isBusy}
            compact={compact}
            onDiscard={handleDiscard}
            onMarkUncomfortable={handleMarkUncomfortable}
          />
        </View>
      )}

      {syncMessage ? (
        <Text selectable style={{ color: palette.muted, fontSize: 14 }}>
          {syncMessage}
        </Text>
      ) : null}
    </ScrollView>
  );
}
