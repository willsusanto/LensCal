import { ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LensCard } from '@/components/lens-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Badge, Card } from '@/components/ui/primitives';
import { palette } from '@/constants/palette';
import { formatReminderTime, formatShortDate } from '@/lib/date-utils';
import { useLens } from '@/providers/lens-provider';

export default function TodayScreen() {
  const { eyes, isBusy, isReady, settings, syncMessage } = useLens();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const compact = width < 390;
  const panelGap = compact ? 8 : 10;
  const activeLenses = [eyes.left.activeLens, eyes.right.activeLens].filter(Boolean);
  const nearestLens = activeLenses
    .slice()
    .sort((a, b) => new Date(a!.expires_at).getTime() - new Date(b!.expires_at).getTime())[0];

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: palette.background }}
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 112, gap: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
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
              Softlens care, made calmer
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
      </View>

      <Card
        tone="soft"
        style={{
          gap: 13,
          padding: 14,
        }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <Badge tone="secondary">TODAY</Badge>
          <Text selectable style={{ color: palette.muted, fontSize: 12, fontWeight: '800' }}>
            Reminder {formatReminderTime(settings.reminderHour, settings.reminderMinute)}
          </Text>
        </View>

        <View style={{ gap: 4 }}>
          <Text selectable style={{ color: palette.muted, fontSize: 12, fontWeight: '900' }}>
            NEXT REPLACEMENT
          </Text>
          <Text selectable style={{ color: palette.ink, fontSize: compact ? 28 : 32, lineHeight: compact ? 31 : 35, fontWeight: '900' }}>
            {nearestLens
              ? `${nearestLens.eye === 'left' ? 'Left' : 'Right'} lens`
              : 'No active lenses'}
          </Text>
          <Text selectable style={{ color: palette.muted, fontSize: 14, lineHeight: 20, fontWeight: '700' }}>
            {nearestLens
              ? formatShortDate(nearestLens.expires_at)
              : 'Open a pack for either eye to start tracking.'}
          </Text>
        </View>

        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: palette.line,
            paddingTop: 12,
            flexDirection: 'row',
            gap: 10,
          }}>
          <View style={{ flex: 1 }}>
            <Text selectable style={{ color: palette.muted, fontSize: 11, fontWeight: '900' }}>
              ACTIVE LENSES
            </Text>
            <Text selectable style={{ color: palette.ink, fontSize: 23, fontWeight: '900', fontVariant: ['tabular-nums'] }}>
              {activeLenses.length}/2
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text selectable style={{ color: palette.muted, fontSize: 11, fontWeight: '900' }}>
              DEFAULT
            </Text>
            <Text selectable numberOfLines={1} adjustsFontSizeToFit style={{ color: palette.ink, fontSize: 17, fontWeight: '900' }}>
              {settings.defaultLensType}
            </Text>
          </View>
        </View>
      </Card>

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
          />
          <LensCard
            state={eyes.right}
            disabled={isBusy}
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
