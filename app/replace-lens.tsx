import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/action-button';
import { SegmentedControl } from '@/components/segmented-control';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { palette } from '@/constants/palette';
import { displayLensType, expirationFor, formatShortDate, replacementDaysFor } from '@/lib/date-utils';
import { lightTap } from '@/lib/haptics';
import { useLens } from '@/providers/lens-provider';
import type { Eye, LensType } from '@/types/lens';

const lensOptions: { label: string; value: LensType }[] = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
];

function normalizeEye(value: unknown): Eye {
  return value === 'right' ? 'right' : 'left';
}

function accentForEye(eye: Eye) {
  return eye === 'left'
    ? {
        strong: palette.black,
        soft: palette.surfaceBlue,
        border: palette.lineStrong,
      }
    : {
        strong: palette.black,
        soft: palette.faint,
        border: palette.line,
      };
}

export default function ReplaceLensScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ eye?: string }>();
  const eye = normalizeEye(params.eye);
  const { settings, replaceLens, isBusy, eyes } = useLens();
  const [lensType, setLensType] = useState<LensType>(settings.defaultLensType);
  const [notes, setNotes] = useState('');
  const activeLens = eyes[eye].activeLens;
  const otherEye: Eye = eye === 'left' ? 'right' : 'left';
  const otherLens = eyes[otherEye].activeLens;
  const expiresAt = expirationFor(new Date(), lensType, settings.monthlyReplacementDays);
  const replacementDays = replacementDaysFor(lensType, settings.monthlyReplacementDays);
  const accent = accentForEye(eye);
  const insets = useSafeAreaInsets();

  async function save() {
    await lightTap();
    await replaceLens(eye, lensType, notes.trim() || null);
    router.back();
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: palette.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View
          style={{
            width: 58,
            height: 58,
            borderRadius: 29,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: accent.soft,
          }}>
          <IconSymbol name="eye.fill" color={accent.strong} size={32} />
        </View>

        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <Text selectable style={{ color: palette.ink, fontSize: 30, fontWeight: '900' }}>
            {activeLens ? 'Change' : 'Open'} {eye === 'left' ? 'Left' : 'Right'}
          </Text>
          <Text selectable style={{ color: palette.muted, fontSize: 14, fontWeight: '700' }}>
            Starts today. Reminder: {formatShortDate(expiresAt)}
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
          REPLACEMENT DATE
        </Text>
        <Text selectable style={{ color: palette.white, fontSize: 30, fontWeight: '900' }}>
          {formatShortDate(expiresAt)}
        </Text>
        <Text selectable style={{ color: '#C7D3E0', fontSize: 13, fontWeight: '700' }}>
          {displayLensType(lensType)} lens · {replacementDays} days
        </Text>
      </View>

      <View
        style={{
          borderRadius: 8,
          borderCurve: 'continuous',
          borderWidth: 1,
          borderColor: palette.lineStrong,
          backgroundColor: palette.surfaceBlue,
          padding: 14,
          gap: 10,
        }}>
        <Text selectable style={{ color: palette.blueDeep, fontSize: 12, fontWeight: '900' }}>
          TRACKER UPDATE
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ flex: 1, gap: 3 }}>
            <Text selectable style={{ color: palette.muted, fontSize: 11, fontWeight: '900' }}>
              CURRENT {eye.toUpperCase()}
            </Text>
            <Text selectable style={{ color: palette.ink, fontSize: 16, fontWeight: '900' }}>
              {activeLens ? formatShortDate(activeLens.expires_at) : 'None'}
            </Text>
          </View>

          <Text selectable style={{ color: palette.muted, fontSize: 13, fontWeight: '900' }}>
            to
          </Text>

          <View style={{ flex: 1, alignItems: 'flex-end', gap: 3 }}>
            <Text selectable style={{ color: palette.muted, fontSize: 11, fontWeight: '900' }}>
              NEW {eye.toUpperCase()}
            </Text>
            <Text selectable style={{ color: palette.ink, fontSize: 16, fontWeight: '900' }}>
              {formatShortDate(expiresAt)}
            </Text>
          </View>
        </View>

        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: palette.lineStrong,
            paddingTop: 10,
            flexDirection: 'row',
            justifyContent: 'space-between',
            gap: 10,
          }}>
          <Text selectable style={{ color: palette.muted, fontSize: 12, fontWeight: '800' }}>
            {otherEye === 'left' ? 'Left' : 'Right'} stays
          </Text>
          <Text selectable style={{ color: palette.ink, fontSize: 12, fontWeight: '900' }}>
            {otherLens ? formatShortDate(otherLens.expires_at) : 'Not set'}
          </Text>
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <Text selectable style={{ color: palette.ink, fontSize: 18, fontWeight: '800' }}>
          Lens Type
        </Text>
        <SegmentedControl options={lensOptions} value={lensType} disabled={isBusy} onChange={setLensType} />
      </View>

      <View style={{ gap: 8 }}>
        <Text selectable style={{ color: palette.muted, fontSize: 14, fontWeight: '700' }}>
          Notes
        </Text>
        <TextInput
          placeholder="Optional"
          placeholderTextColor={palette.muted}
          value={notes}
          onChangeText={setNotes}
          multiline
          textAlignVertical="top"
          style={{
            minHeight: 96,
            borderRadius: 8,
            borderCurve: 'continuous',
            borderWidth: 1,
            borderColor: palette.line,
            backgroundColor: palette.surface,
            padding: 12,
            color: palette.ink,
          }}
        />
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <ActionButton label={activeLens ? 'Change Lens' : 'Open Lens'} tone="primary" disabled={isBusy} onPress={save} />
        <ActionButton label="Cancel" disabled={isBusy} onPress={() => router.back()} />
      </View>
    </ScrollView>
  );
}
