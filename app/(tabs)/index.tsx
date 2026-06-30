import { ScrollView, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/app-text';
import { LensCard } from '@/components/lens-card';
import { Badge, Card } from '@/components/ui/primitives';
import { palette } from '@/constants/palette';
import { formatReminderTime, formatShortDate } from '@/lib/date-utils';
import { useLens } from '@/providers/lens-provider';

export default function TodayScreen() {
  const {
    currentDate,
    eyes,
    isBusy,
    isReady,
    settings,
    syncMessage,
  } = useLens();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const compact = width < 390;
  const activeLenses = [eyes.left.activeLens, eyes.right.activeLens].filter(Boolean);
  const nearestLens = activeLenses
    .slice()
    .sort((a, b) => new Date(a!.expires_at).getTime() - new Date(b!.expires_at).getTime())[0];

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="never"
      stickyHeaderIndices={[0]}
      style={{ flex: 1, backgroundColor: palette.background }}
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 0, paddingBottom: insets.bottom + 112, gap: 16 }}>
      <View
        style={{
          gap: 4,
          backgroundColor: palette.background,
          marginHorizontal: -16,
          paddingHorizontal: 16,
          paddingTop: insets.top + 16,
          paddingBottom: 12,
          zIndex: 10,
        }}>
        <Text selectable style={{ color: palette.ink, fontSize: 34, fontWeight: '900' }}>
          LensCal
        </Text>
        <Text selectable style={{ color: palette.muted, fontSize: 15, fontWeight: '700' }}>
          Softlens care, made calmer.
        </Text>
      </View>

      <Card
        tone="soft"
        style={{
          width: '100%',
          maxWidth: 520,
          alignSelf: 'center',
          gap: 14,
          padding: 16,
        }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <Badge tone="secondary">TODAY</Badge>
          <Text selectable style={{ color: palette.muted, fontSize: 12, fontWeight: '800' }}>
            Reminder {formatReminderTime(settings.reminderHour, settings.reminderMinute)}
          </Text>
        </View>

        {/* Test date controls are intentionally hidden outside manual QA. */}

        <View style={{ gap: 7 }}>
          <Text selectable style={{ color: palette.muted, fontSize: 12, fontWeight: '900' }}>
            NEXT REPLACEMENT
          </Text>
          <Text selectable style={{ color: palette.ink, fontSize: compact ? 28 : 32, lineHeight: compact ? 36 : 40, fontWeight: '900' }}>
            {nearestLens
              ? `${nearestLens.eye === 'left' ? 'Left' : 'Right'} lens`
              : 'No active lenses'}
          </Text>
          <Text selectable style={{ color: palette.muted, fontSize: 14, lineHeight: 22, fontWeight: '700' }}>
            {nearestLens
              ? formatShortDate(nearestLens.expires_at)
              : 'Open a pack for either eye to start tracking.'}
          </Text>
        </View>
      </Card>

      {!isReady ? (
        <Card style={{ gap: 8 }}>
          <Text selectable style={{ color: palette.ink, fontSize: 18, fontWeight: '900' }}>
            Loading lenses
          </Text>
          <Text selectable style={{ color: palette.muted, fontSize: 14, fontWeight: '700' }}>
            Preparing your current lens status.
          </Text>
        </Card>
      ) : (
        <View
          style={{
            width: '100%',
            maxWidth: 520,
            alignSelf: 'center',
            gap: 12,
          }}>
          <View style={{ gap: 3 }}>
            <Text selectable style={{ color: palette.ink, fontSize: 21, fontWeight: '900' }}>
              Current lenses
            </Text>
            <Text selectable style={{ color: palette.muted, fontSize: 14, fontWeight: '700' }}>
              Left and right lenses are tracked separately.
            </Text>
          </View>
          <LensCard
            state={eyes.left}
            disabled={isBusy}
            currentDate={currentDate}
            compact={compact}
          />
          <LensCard
            state={eyes.right}
            disabled={isBusy}
            currentDate={currentDate}
            compact={compact}
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
