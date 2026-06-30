import { ScrollView, Text, View } from 'react-native';
import Animated, { FadeInUp, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { palette } from '@/constants/palette';
import { displayLensType, formatDateTime, formatShortDate } from '@/lib/date-utils';
import { useLens } from '@/providers/lens-provider';
import type { LensEvent, LensUsage } from '@/types/lens';

function eventLabel(event: LensEvent) {
  switch (event.event_type) {
    case 'opened':
      return 'Opened';
    case 'uncomfortable':
      return 'Marked uncomfortable';
    case 'discarded':
      return 'Discarded';
    case 'replaced':
      return 'Replaced';
  }
}

function UsageRow({ usage, events }: { usage: LensUsage; events: LensEvent[] }) {
  const usageEvents = events.filter((event) => event.lens_usage_id === usage.id);
  const isLeft = usage.eye === 'left';

  return (
    <Animated.View
      entering={FadeInUp.duration(240).springify().damping(18)}
      layout={LinearTransition.springify().damping(18).stiffness(220)}
      style={{
        gap: 10,
        borderRadius: 8,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: usage.status === 'active' ? palette.lineStrong : palette.line,
        backgroundColor: palette.surface,
        padding: 16,
      }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 }}>
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isLeft ? palette.surfaceBlue : palette.faint,
            }}>
            <IconSymbol name="eye.fill" color={palette.black} size={24} />
          </View>

          <View style={{ flexShrink: 1, gap: 3 }}>
            <Text selectable style={{ color: palette.ink, fontSize: 18, fontWeight: '900' }}>
              {usage.eye === 'left' ? 'Left Eye' : 'Right Eye'}
            </Text>
            <Text selectable style={{ color: palette.muted, fontSize: 14, fontWeight: '700' }}>
              {displayLensType(usage.lens_type)} lens
            </Text>
          </View>
        </View>
        <View
          style={{
            alignSelf: 'flex-start',
            borderRadius: 999,
            backgroundColor: usage.status === 'active' ? palette.surfaceBlue : palette.faint,
            paddingHorizontal: 10,
            paddingVertical: 5,
          }}>
          <Text
            selectable
            style={{
              color: usage.status === 'active' ? palette.blueDeep : palette.muted,
              fontSize: 12,
              fontWeight: '900',
              textTransform: 'uppercase',
            }}>
            {usage.status}
          </Text>
        </View>
      </View>

      <Text selectable style={{ color: palette.inkSoft, fontSize: 15, fontWeight: '700' }}>
        {formatShortDate(usage.opened_at)} - {formatShortDate(usage.expires_at)}
      </Text>

      {usage.notes ? (
        <Text selectable style={{ color: palette.muted, fontSize: 14 }}>
          {usage.notes}
        </Text>
      ) : null}

      <View style={{ gap: 6, borderTopWidth: 1, borderTopColor: palette.faint, paddingTop: 10 }}>
        {usageEvents.map((event) => (
          <Text key={event.id} selectable style={{ color: palette.muted, fontSize: 14 }}>
            {eventLabel(event)} · {formatDateTime(event.event_at)}
          </Text>
        ))}
      </View>
    </Animated.View>
  );
}

export default function HistoryScreen() {
  const { history, events, isReady } = useLens();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: palette.background }}
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 112, gap: 16 }}>
      <Animated.View entering={FadeInUp.duration(220).springify().damping(18)} style={{ gap: 4 }}>
        <Text selectable style={{ color: palette.ink, fontSize: 34, fontWeight: '900' }}>
          History
        </Text>
        <Text selectable style={{ color: palette.muted, fontSize: 15 }}>
          Past lenses and discomfort events.
        </Text>
      </Animated.View>

      {!isReady ? (
        <Text selectable style={{ color: palette.muted, fontSize: 16 }}>
          Loading history...
        </Text>
      ) : history.length === 0 ? (
        <Animated.View
          entering={FadeInUp.duration(260).delay(70).springify().damping(18)}
          style={{
            alignItems: 'center',
            gap: 12,
            borderRadius: 8,
            borderCurve: 'continuous',
            borderWidth: 1,
            borderColor: palette.lineStrong,
            backgroundColor: palette.surfaceBlue,
            padding: 22,
          }}>
          <View
            style={{
              width: 58,
              height: 58,
              borderRadius: 29,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: palette.surface,
            }}>
            <IconSymbol name="eye.fill" color={palette.black} size={32} />
          </View>
          <View style={{ alignItems: 'center', gap: 4 }}>
            <Text selectable style={{ color: palette.ink, fontSize: 22, fontWeight: '900', textAlign: 'center' }}>
              No history yet
            </Text>
            <Text selectable style={{ color: palette.muted, fontSize: 14, fontWeight: '700', textAlign: 'center' }}>
              Open or replace a lens and each eye will build its own timeline here.
            </Text>
          </View>
        </Animated.View>
      ) : (
        history.map((usage) => <UsageRow key={usage.id} usage={usage} events={events} />)
      )}
    </ScrollView>
  );
}
