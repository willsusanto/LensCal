import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { AnimatedPressable } from '@/components/animated-pressable';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Badge, Card } from '@/components/ui/primitives';
import { palette } from '@/constants/palette';
import { daysRemaining, daysUsed, displayLensType, formatShortDate, lensDurationDays } from '@/lib/date-utils';
import type { Eye, EyeState } from '@/types/lens';

type LensCardProps = {
  state: EyeState;
  disabled: boolean;
  compact?: boolean;
};

function titleForEye(eye: Eye) {
  return eye === 'left' ? 'Left' : 'Right';
}

function accentForEye(eye: Eye) {
  return eye === 'left'
    ? {
        strong: palette.black,
        soft: palette.surfaceBlue,
        border: palette.lineStrong,
        rail: palette.blueDeep,
      }
    : {
        strong: palette.black,
        soft: palette.faint,
        border: palette.line,
        rail: palette.blue,
      };
}

function statusTone(remaining: number) {
  if (remaining < 0) {
    return {
      label: 'Expired',
      backgroundColor: palette.dangerBg,
      color: palette.danger,
    };
  }

  if (remaining <= 2) {
    return {
      label: 'Due soon',
      backgroundColor: palette.warningBg,
      color: palette.warning,
    };
  }

  return {
    label: 'Active',
    backgroundColor: palette.surfaceBlue,
    color: palette.blueDeep,
  };
}

export function LensCard({
  state,
  disabled,
  compact = false,
}: LensCardProps) {
  const router = useRouter();
  const lens = state.activeLens;
  const duration = lens ? lensDurationDays(lens.opened_at, lens.expires_at) : 28;
  const used = lens ? daysUsed(lens.opened_at) : 0;
  const remaining = lens ? daysRemaining(lens.expires_at) : 0;
  const progress = lens ? Math.min(1, used / duration) : 0;
  const tone = lens ? statusTone(remaining) : null;
  const accent = accentForEye(state.eye);

  return (
    <Card
      style={{
        minWidth: 0,
        flex: 1,
        flexBasis: '48%',
        flexShrink: 1,
        gap: compact ? 9 : 11,
        padding: compact ? 10 : 12,
      }}>
      <View style={{ alignItems: 'center', gap: compact ? 6 : 8 }}>
        <View
          style={{
            alignSelf: 'stretch',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}>
          <Text selectable style={{ color: palette.muted, fontSize: 11, fontWeight: '900' }}>
            {state.eye === 'left' ? 'LEFT EYE' : 'RIGHT EYE'}
          </Text>
          <Badge tone={lens ? 'primary' : 'secondary'}>{lens ? 'TRACKING' : 'EMPTY'}</Badge>
        </View>

        <View
          style={{
            width: compact ? 48 : 54,
            height: compact ? 48 : 54,
            borderRadius: compact ? 24 : 27,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: palette.coralSoft,
            boxShadow: `0 10px 24px ${palette.softShadow}`,
          }}>
          <IconSymbol name="eye.fill" color={accent.strong} size={compact ? 28 : 30} />
        </View>

        <View style={{ alignItems: 'center', gap: 3 }}>
          <Text selectable style={{ color: palette.ink, fontSize: compact ? 18 : 20, fontWeight: '900' }}>
            {titleForEye(state.eye)}
          </Text>
          <Text
            selectable
            numberOfLines={compact ? 1 : 2}
            style={{
              color: palette.muted,
              fontSize: compact ? 11 : 12,
              fontWeight: '700',
              textAlign: 'center',
            }}>
            {lens ? `${displayLensType(lens.lens_type)} lens` : 'Ready to open'}
          </Text>
        </View>

        {tone ? (
          <View
            style={{
              borderRadius: 999,
              backgroundColor: tone.backgroundColor,
              paddingHorizontal: 10,
              paddingVertical: 5,
            }}>
            <Text selectable style={{ color: tone.color, fontSize: compact ? 11 : 12, fontWeight: '800' }}>
              {tone.label}
            </Text>
          </View>
        ) : null}
      </View>

      {lens ? (
        <View style={{ alignItems: 'center', gap: 2 }}>
          <Text selectable style={{ color: palette.muted, fontSize: compact ? 11 : 12, fontWeight: '800' }}>
            Day
          </Text>
          <Text
            selectable
            style={{
              color: palette.ink,
              fontSize: compact ? 42 : 48,
              lineHeight: compact ? 46 : 52,
              fontWeight: '900',
              fontVariant: ['tabular-nums'],
            }}>
            {used}
          </Text>
          <Text selectable style={{ color: palette.muted, fontSize: compact ? 12 : 13, fontWeight: '700' }}>
            of {duration}
          </Text>
          <View
            style={{
              width: '100%',
              height: 6,
              borderRadius: 999,
              backgroundColor: palette.faint,
              marginTop: 7,
              overflow: 'hidden',
            }}>
            <View
              style={{
                width: `${progress * 100}%`,
                height: 6,
                borderRadius: 999,
                backgroundColor: remaining < 0 ? palette.danger : accent.rail,
              }}
            />
          </View>
        </View>
      ) : (
        <View
          style={{
            minHeight: compact ? 76 : 86,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 8,
            borderCurve: 'continuous',
            backgroundColor: palette.surfaceSoft,
            padding: 10,
            gap: 5,
          }}>
          <Text selectable style={{ color: palette.ink, fontSize: compact ? 18 : 20, fontWeight: '900' }}>
            Start fresh
          </Text>
          <Text selectable style={{ color: palette.muted, fontSize: 12, fontWeight: '700', textAlign: 'center' }}>
            Open a pack for a fresh date.
          </Text>
        </View>
      )}

      {lens ? (
        <View style={{ alignItems: 'center', gap: 5 }}>
          <Text
            selectable
            numberOfLines={1}
            adjustsFontSizeToFit
            style={{ color: palette.inkSoft, fontSize: compact ? 12 : 13, fontWeight: '800', textAlign: 'center' }}>
            Replace by {formatShortDate(lens.expires_at)}
          </Text>
          <Text
            selectable
            style={{
              color: remaining < 0 ? palette.danger : palette.muted,
              fontSize: compact ? 11 : 12,
              fontWeight: '700',
              textAlign: 'center',
            }}>
            {remaining < 0
              ? `${Math.abs(remaining)} day${Math.abs(remaining) === 1 ? '' : 's'} overdue`
              : remaining === 0
                ? 'Due today'
                : `${remaining} day${remaining === 1 ? '' : 's'} remaining`}
          </Text>
          {state.latestUncomfortableEvent ? (
            <Text
              selectable
              numberOfLines={1}
              adjustsFontSizeToFit
              style={{ color: palette.warning, fontSize: compact ? 11 : 12, fontWeight: '800', textAlign: 'center' }}>
              Feels off · {formatShortDate(state.latestUncomfortableEvent.event_at)}
            </Text>
          ) : null}
        </View>
      ) : null}

      <AnimatedPressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={() => router.push(`/replace-lens?eye=${state.eye}` as never)}
        style={{
          minHeight: 42,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: compact ? 6 : 8,
          borderRadius: 999,
          backgroundColor: lens ? palette.black : palette.coral,
          opacity: disabled ? 0.45 : 1,
          paddingHorizontal: 10,
          paddingVertical: 10,
        }}>
        <IconSymbol name="arrow.triangle.2.circlepath" color={palette.white} size={compact ? 17 : 18} />
        <Text selectable style={{ color: palette.white, fontSize: compact ? 12 : 13, fontWeight: '900' }}>
          {lens ? 'Change lens' : 'Open pack'}
        </Text>
      </AnimatedPressable>
    </Card>
  );
}
