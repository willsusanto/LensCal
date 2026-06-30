import { useRouter } from 'expo-router';
import { Alert, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LensCard } from '@/components/lens-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { palette } from '@/constants/palette';
import { daysRemaining, formatReminderTime, formatShortDate } from '@/lib/date-utils';
import { lightTap, warningTap } from '@/lib/haptics';
import { useLens } from '@/providers/lens-provider';
import type { Eye } from '@/types/lens';

export default function TodayScreen() {
  const router = useRouter();
  const { eyes, isBusy, isReady, markUncomfortable, discardLens, settings, syncMessage } = useLens();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
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
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 112, gap: 16 }}>
      <Animated.View
        entering={FadeInDown.duration(240).springify().damping(18)}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 }}>
          <View
            style={{
              width: 46,
              height: 46,
              borderRadius: 23,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: palette.surface,
              boxShadow: `0 10px 24px ${palette.softShadow}`,
            }}>
            <IconSymbol name="eye.fill" color={palette.black} size={25} />
          </View>
          <View style={{ gap: 2, flexShrink: 1 }}>
            <Text selectable style={{ color: palette.ink, fontSize: compact ? 22 : 24, fontWeight: '900' }}>
              LensCal
            </Text>
            <Text selectable style={{ color: palette.muted, fontSize: compact ? 12 : 13, fontWeight: '700' }}>
              Separate left and right dates
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View
            style={{
              width: 46,
              height: 46,
              borderRadius: 23,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: palette.surface,
              boxShadow: `0 10px 24px ${palette.softShadow}`,
            }}>
            <IconSymbol name="bell.fill" color={palette.black} size={22} />
          </View>
        </View>
      </Animated.View>

      <Animated.View
        entering={FadeInUp.duration(260).delay(60).springify().damping(18)}
        style={{
          gap: 14,
          borderRadius: 8,
          borderCurve: 'continuous',
          backgroundColor: palette.surface,
          padding: 16,
          boxShadow: `0 18px 42px ${palette.softShadow}`,
        }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ gap: 5, flex: 1, minWidth: 0 }}>
            <Text selectable style={{ color: palette.ink, fontSize: compact ? 26 : 30, fontWeight: '900' }}>
              Today
            </Text>
            <Text selectable style={{ color: palette.muted, fontSize: compact ? 13 : 14, fontWeight: '700' }}>
              Reminder at {formatReminderTime(settings.reminderHour, settings.reminderMinute)}
            </Text>
          </View>

          <View
            style={{
              minWidth: 78,
              alignItems: 'center',
              borderRadius: 999,
              backgroundColor: palette.blueDeep,
              paddingHorizontal: 12,
              paddingVertical: 9,
            }}>
            <Text selectable style={{ color: palette.white, fontSize: 10, fontWeight: '900' }}>
              ACTIVE
            </Text>
            <Text
              selectable
              style={{ color: palette.white, fontSize: 18, fontWeight: '900', fontVariant: ['tabular-nums'] }}>
              {activeLenses.length}/2
            </Text>
          </View>
        </View>

        <View
          style={{
            borderRadius: 8,
            borderCurve: 'continuous',
            backgroundColor: palette.black,
            padding: 15,
            gap: 5,
          }}>
          <Text selectable style={{ color: '#A9D7FF', fontSize: 12, fontWeight: '900' }}>
            NEXT REPLACEMENT
          </Text>
          <Text selectable style={{ color: palette.white, fontSize: compact ? 22 : 25, fontWeight: '900' }}>
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
      </Animated.View>

      {!isReady ? (
        <Text selectable style={{ color: palette.muted, fontSize: 16 }}>
          Loading lenses...
        </Text>
      ) : (
        <Animated.View
          entering={FadeInUp.duration(260).delay(120).springify().damping(18)}
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
        </Animated.View>
      )}

      {syncMessage ? (
        <Text selectable style={{ color: palette.muted, fontSize: 14 }}>
          {syncMessage}
        </Text>
      ) : null}
    </ScrollView>
  );
}
