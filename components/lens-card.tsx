import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { AnimatedPressable } from '@/components/animated-pressable';
import { Text } from '@/components/app-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Card } from '@/components/ui/primitives';
import { palette } from '@/constants/palette';
import { daysRemaining, daysUsed, displayLensType, formatShortDate, lensDurationDays } from '@/lib/date-utils';
import type { Eye, EyeState } from '@/types/lens';

type LensCardProps = {
  state: EyeState;
  disabled: boolean;
  currentDate: Date;
  compact?: boolean;
};

function titleForEye(eye: Eye) {
  return eye === 'left' ? 'Left' : 'Right';
}

function accentForEye(eye: Eye) {
  return eye === 'left'
    ? {
        strong: palette.blueDeep,
        soft: palette.surfaceBlue,
        border: palette.lineStrong,
        rail: palette.blueDeep,
      }
    : {
        strong: palette.black,
        soft: palette.surfaceSoft,
        border: palette.line,
        rail: palette.black,
      };
}

export function LensCard({
  state,
  disabled,
  currentDate,
  compact = false,
}: LensCardProps) {
  const router = useRouter();
  const lens = state.activeLens;
  const duration = lens ? lensDurationDays(lens.opened_at, lens.expires_at) : 28;
  const used = lens ? daysUsed(lens.opened_at, currentDate) : 0;
  const remaining = lens ? daysRemaining(lens.expires_at, currentDate) : 0;
  const progress = lens ? Math.min(1, used / duration) : 0;
  const accent = accentForEye(state.eye);
  const isExpired = remaining < 0;
  const replaceLabel = isExpired ? `${Math.abs(remaining)}d overdue` : `${remaining}d left`;

  return (
    <Card
      style={{
        width: '100%',
        gap: compact ? 12 : 14,
        padding: compact ? 14 : 16,
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 }}>
          <View
            style={{
              width: compact ? 48 : 52,
              height: compact ? 48 : 52,
              borderRadius: compact ? 24 : 26,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: accent.soft,
            }}>
            <IconSymbol name="eye.fill" color={accent.strong} size={compact ? 27 : 29} />
          </View>

          <View style={{ flexShrink: 1, gap: 3 }}>
            <Text selectable style={{ color: palette.ink, fontSize: compact ? 20 : 22, fontWeight: '900' }}>
              {titleForEye(state.eye)} lens
            </Text>
            <Text selectable style={{ color: palette.muted, fontSize: 13, fontWeight: '700' }}>
              {lens ? `${displayLensType(lens.lens_type)} cycle` : 'No active lens'}
            </Text>
          </View>
        </View>

        <View
          style={{
            borderRadius: 999,
            backgroundColor: lens ? (isExpired ? palette.dangerBg : palette.surfaceBlue) : palette.surfaceSoft,
            paddingHorizontal: 10,
            paddingVertical: 6,
          }}>
          <Text
            selectable
            style={{
              color: lens ? (isExpired ? palette.danger : palette.blueDeep) : palette.muted,
              fontSize: 12,
              fontWeight: '900',
            }}>
            {lens ? replaceLabel : 'READY'}
          </Text>
        </View>
      </View>

      {lens ? (
        <View style={{ gap: 12 }}>
          <View
            style={{
              borderRadius: 8,
              borderCurve: 'continuous',
              backgroundColor: palette.surfaceSoft,
              padding: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
            }}>
            <View style={{ gap: 2 }}>
              <Text selectable style={{ color: palette.muted, fontSize: 11, fontWeight: '900' }}>
                DAY
              </Text>
              <Text
                selectable
                style={{
                  color: palette.ink,
                  fontSize: compact ? 38 : 42,
                  lineHeight: compact ? 42 : 46,
                  fontWeight: '900',
                  fontVariant: ['tabular-nums'],
                }}>
                {used}
              </Text>
            </View>

            <View style={{ alignItems: 'flex-end', gap: 2 }}>
              <Text selectable style={{ color: palette.muted, fontSize: 11, fontWeight: '900' }}>
                REPLACE BY
              </Text>
              <Text selectable style={{ color: palette.ink, fontSize: 19, fontWeight: '900' }}>
                {formatShortDate(lens.expires_at)}
              </Text>
            </View>
          </View>

          <View
            style={{
              width: '100%',
              height: 8,
              borderRadius: 999,
              backgroundColor: palette.faint,
              overflow: 'hidden',
            }}>
            <View
              style={{
                width: `${progress * 100}%`,
                height: 8,
                borderRadius: 999,
                backgroundColor: isExpired ? palette.danger : accent.rail,
              }}
            />
          </View>
        </View>
      ) : (
        <View
          style={{
            minHeight: compact ? 76 : 86,
            justifyContent: 'center',
            borderRadius: 8,
            borderCurve: 'continuous',
            borderWidth: 1,
            borderColor: palette.line,
            backgroundColor: palette.surfaceBlue,
            padding: 14,
            gap: 5,
          }}>
          <Text selectable style={{ color: palette.ink, fontSize: compact ? 19 : 21, fontWeight: '900' }}>
            Start fresh
          </Text>
          <Text selectable style={{ color: palette.muted, fontSize: 13, fontWeight: '700' }}>
            Open a pack for a fresh date.
          </Text>
        </View>
      )}

      {lens && state.latestUncomfortableEvent ? (
        <View
          style={{
            borderRadius: 8,
            borderCurve: 'continuous',
            backgroundColor: palette.warningBg,
            paddingHorizontal: 12,
            paddingVertical: 9,
          }}>
          <Text selectable style={{ color: palette.warning, fontSize: compact ? 12 : 13, fontWeight: '800' }}>
            Feels off since {formatShortDate(state.latestUncomfortableEvent.event_at)}
          </Text>
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
          backgroundColor: lens ? palette.black : palette.blueDeep,
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
