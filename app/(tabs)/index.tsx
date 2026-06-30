import { useRouter } from 'expo-router';
import { Alert, ScrollView, Text, useWindowDimensions, View } from 'react-native';

import { LensCard } from '@/components/lens-card';
import { palette } from '@/constants/palette';
import { daysRemaining, formatReminderTime, formatShortDate } from '@/lib/date-utils';
import { lightTap, warningTap } from '@/lib/haptics';
import { useLens } from '@/providers/lens-provider';
import type { Eye } from '@/types/lens';

export default function TodayScreen() {
  const router = useRouter();
  const { eyes, isBusy, isReady, markUncomfortable, discardLens, settings, syncMessage } = useLens();
  const { width } = useWindowDimensions();
  const compact = width < 390;
  const panelGap = compact ? 8 : 10;
  const activeLenses = [eyes.left.activeLens, eyes.right.activeLens].filter(Boolean);
  const nearestLens = activeLenses
    .slice()
    .sort((a, b) => new Date(a!.expires_at).getTime() - new Date(b!.expires_at).getTime())[0];
  const nearestRemaining = nearestLens ? daysRemaining(nearestLens.expires_at) : null;

  async function handleMarkUncomfortable(eye: Eye) {
    await lightTap();
    await markUncomfortable(eye);
    const label = eye === 'left' ? 'Left' : 'Right';

    Alert.alert(`${label} marked uncomfortable`, '', [
      { text: 'Done', style: 'cancel' },
      {
        text: 'Replace now',
        onPress: () => router.push(`/replace-lens?eye=${eye}` as never),
      },
    ]);
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
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ gap: 3, flexShrink: 1 }}>
          <Text selectable style={{ color: palette.ink, fontSize: compact ? 30 : 34, fontWeight: '900' }}>
            Today
          </Text>
          <Text selectable style={{ color: palette.muted, fontSize: compact ? 13 : 14, fontWeight: '700' }}>
            Reminder at {formatReminderTime(settings.reminderHour, settings.reminderMinute)}
          </Text>
        </View>

        <View
          style={{
            minWidth: 72,
            alignItems: 'center',
            borderRadius: 8,
            borderCurve: 'continuous',
            backgroundColor: palette.surface,
            borderWidth: 1,
            borderColor: palette.line,
            paddingHorizontal: 10,
            paddingVertical: 8,
          }}>
          <Text selectable style={{ color: palette.blueDeep, fontSize: 11, fontWeight: '900' }}>
            ACTIVE
          </Text>
          <Text selectable style={{ color: palette.ink, fontSize: 18, fontWeight: '900', fontVariant: ['tabular-nums'] }}>
            {activeLenses.length}/2
          </Text>
        </View>
      </View>

      <View
        style={{
          borderRadius: 8,
          borderCurve: 'continuous',
          backgroundColor: palette.black,
          padding: 16,
          gap: 5,
          boxShadow: `0 14px 30px ${palette.shadow}`,
        }}>
        <Text selectable style={{ color: '#A9D7FF', fontSize: 12, fontWeight: '900' }}>
          NEXT REPLACEMENT
        </Text>
        <Text selectable style={{ color: palette.white, fontSize: compact ? 22 : 26, fontWeight: '900' }}>
          {nearestLens
            ? `${nearestLens.eye === 'left' ? 'Left' : 'Right'} · ${formatShortDate(nearestLens.expires_at)}`
            : 'No active lenses'}
        </Text>
        <Text selectable style={{ color: '#C7D3E0', fontSize: 13, fontWeight: '700' }}>
          {nearestLens
            ? nearestRemaining === 0
              ? 'Due today'
              : nearestRemaining! < 0
                ? `${Math.abs(nearestRemaining!)} day${Math.abs(nearestRemaining!) === 1 ? '' : 's'} overdue`
                : `${nearestRemaining} day${nearestRemaining === 1 ? '' : 's'} remaining`
            : 'Open left or right lens to start tracking.'}
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
