import { ScrollView, Text, View } from 'react-native';

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

  return (
    <View
      style={{
        gap: 10,
        borderRadius: 8,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: palette.line,
        backgroundColor: palette.surface,
        padding: 16,
      }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flexShrink: 1, gap: 4 }}>
          <Text selectable style={{ color: palette.ink, fontSize: 18, fontWeight: '800' }}>
            {usage.eye === 'left' ? 'Left Eye' : 'Right Eye'}
          </Text>
          <Text selectable style={{ color: palette.muted, fontSize: 14 }}>
            {displayLensType(usage.lens_type)} lens
          </Text>
        </View>
        <Text
          selectable
          style={{
            color: usage.status === 'active' ? palette.blueDeep : palette.muted,
            fontSize: 13,
            fontWeight: '800',
            textTransform: 'uppercase',
          }}>
          {usage.status}
        </Text>
      </View>

      <Text selectable style={{ color: palette.inkSoft, fontSize: 15, fontWeight: '700' }}>
        {formatShortDate(usage.opened_at)} - {formatShortDate(usage.expires_at)}
      </Text>

      {usage.notes ? (
        <Text selectable style={{ color: palette.muted, fontSize: 14 }}>
          {usage.notes}
        </Text>
      ) : null}

      <View style={{ gap: 6 }}>
        {usageEvents.map((event) => (
          <Text key={event.id} selectable style={{ color: palette.muted, fontSize: 14 }}>
            {eventLabel(event)} · {formatDateTime(event.event_at)}
          </Text>
        ))}
      </View>
    </View>
  );
}

export default function HistoryScreen() {
  const { history, events, isReady } = useLens();

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: palette.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 16 }}>
      <View style={{ gap: 4 }}>
        <Text selectable style={{ color: palette.ink, fontSize: 34, fontWeight: '900' }}>
          History
        </Text>
        <Text selectable style={{ color: palette.muted, fontSize: 15 }}>
          Past lenses and discomfort events.
        </Text>
      </View>

      {!isReady ? (
        <Text selectable style={{ color: palette.muted, fontSize: 16 }}>
          Loading history...
        </Text>
      ) : history.length === 0 ? (
        <View
          style={{
            borderRadius: 8,
            borderCurve: 'continuous',
            borderWidth: 1,
            borderColor: palette.line,
            backgroundColor: palette.surface,
            padding: 16,
          }}>
          <Text selectable style={{ color: palette.muted, fontSize: 15 }}>
            No lens history yet.
          </Text>
        </View>
      ) : (
        history.map((usage) => <UsageRow key={usage.id} usage={usage} events={events} />)
      )}
    </ScrollView>
  );
}
