import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { palette } from '@/constants/palette';
import { daysRemaining, daysUsed, displayLensType, formatShortDate, lensDurationDays } from '@/lib/date-utils';
import type { Eye, EyeState } from '@/types/lens';

type LensCardProps = {
  state: EyeState;
  disabled: boolean;
  compact?: boolean;
  onDiscard: (eye: Eye) => void;
  onMarkUncomfortable: (eye: Eye) => void;
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
  onDiscard,
  onMarkUncomfortable,
}: LensCardProps) {
  const router = useRouter();
  const lens = state.activeLens;
  const duration = lens ? lensDurationDays(lens.opened_at, lens.expires_at) : 28;
  const used = lens ? daysUsed(lens.opened_at) : 0;
  const remaining = lens ? daysRemaining(lens.expires_at) : 0;
  const progress = lens ? Math.min(1, used / duration) : 0;
  const tone = lens
    ? statusTone(remaining)
    : {
        label: 'No active lens',
        backgroundColor: palette.faint,
        color: palette.muted,
      };
  const accent = accentForEye(state.eye);

  return (
    <View
      style={{
        minWidth: 0,
        flex: 1,
        flexBasis: '48%',
        flexShrink: 1,
        gap: compact ? 10 : 14,
        borderRadius: 8,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: accent.border,
        backgroundColor: palette.surface,
        padding: compact ? 10 : 12,
        boxShadow: '0 8px 20px rgba(18, 28, 25, 0.08)',
      }}>
      <View style={{ alignItems: 'center', gap: compact ? 6 : 8 }}>
        <View
          style={{
            width: compact ? 52 : 62,
            height: compact ? 52 : 62,
            borderRadius: compact ? 26 : 31,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: accent.soft,
          }}>
          <IconSymbol name="eye.fill" color={accent.strong} size={compact ? 30 : 34} />
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
            {lens ? `${displayLensType(lens.lens_type)} lens` : 'No lens'}
          </Text>
        </View>

        <View
          style={{
            borderRadius: 999,
            backgroundColor: tone.backgroundColor,
            paddingHorizontal: 10,
            paddingVertical: 5,
          }}>
          <Text selectable style={{ color: tone.color, fontSize: compact ? 11 : 12, fontWeight: '800' }}>
            {compact && !lens ? 'Empty' : tone.label}
          </Text>
        </View>
      </View>

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
          {lens ? used : '-'}
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

      <View style={{ gap: 8 }}>
        <Pressable
          accessibilityRole="button"
          disabled={disabled}
          onPress={() => router.push(`/replace-lens?eye=${state.eye}` as never)}
          style={({ pressed }) => ({
            minHeight: 44,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: compact ? 6 : 8,
            borderRadius: 8,
            borderCurve: 'continuous',
            backgroundColor: palette.black,
            opacity: disabled ? 0.45 : pressed ? 0.72 : 1,
            paddingHorizontal: 10,
            paddingVertical: 10,
          })}>
          <IconSymbol name="arrow.triangle.2.circlepath" color={palette.white} size={compact ? 17 : 18} />
          <Text selectable style={{ color: palette.white, fontSize: compact ? 12 : 13, fontWeight: '900' }}>
            {lens ? 'Replace' : 'Open'}
          </Text>
        </Pressable>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Mark ${state.eye} lens uncomfortable`}
            disabled={disabled || !lens}
            onPress={() => onMarkUncomfortable(state.eye)}
            style={({ pressed }) => ({
              minHeight: 42,
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 8,
              borderCurve: 'continuous',
              borderWidth: 1,
              borderColor: '#F1D596',
              backgroundColor: palette.warningBg,
              opacity: disabled || !lens ? 0.4 : pressed ? 0.72 : 1,
            })}>
            <IconSymbol name="exclamationmark.triangle.fill" color={palette.warning} size={20} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Discard ${state.eye} lens`}
            disabled={disabled || !lens}
            onPress={() => onDiscard(state.eye)}
            style={({ pressed }) => ({
              minHeight: 42,
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 8,
              borderCurve: 'continuous',
              borderWidth: 1,
              borderColor: '#F0B7C0',
              backgroundColor: palette.dangerBg,
              opacity: disabled || !lens ? 0.4 : pressed ? 0.72 : 1,
            })}>
            <IconSymbol name="trash.fill" color={palette.danger} size={20} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
