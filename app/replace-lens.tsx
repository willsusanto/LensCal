import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { SegmentedControl } from '@/components/segmented-control';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { palette } from '@/constants/palette';
import { displayLensType, expirationFor, formatShortDate } from '@/lib/date-utils';
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
  const expiresAt = expirationFor(new Date(), lensType);
  const accent = accentForEye(eye);

  async function save() {
    await lightTap();
    await replaceLens(eye, lensType, notes.trim() || null);
    router.back();
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: palette.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 16 }}>
      <View
        style={{
          alignItems: 'center',
          gap: 10,
          borderRadius: 8,
          borderCurve: 'continuous',
          borderWidth: 1,
          borderColor: accent.border,
          backgroundColor: palette.surface,
          padding: 18,
        }}>
        <View
          style={{
            width: 70,
            height: 70,
            borderRadius: 35,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: accent.soft,
          }}>
          <IconSymbol name="eye.fill" color={accent.strong} size={38} />
        </View>

        <View style={{ alignItems: 'center', gap: 4 }}>
          <Text selectable style={{ color: palette.ink, fontSize: 28, fontWeight: '900', textAlign: 'center' }}>
            {activeLens ? 'Replace' : 'Open'} {eye === 'left' ? 'Left' : 'Right'}
          </Text>
          <Text selectable style={{ color: palette.muted, fontSize: 15, textAlign: 'center' }}>
            Starts today. Reminder: {formatShortDate(expiresAt)}.
          </Text>
        </View>
      </View>

      <View
        style={{
          gap: 14,
          borderRadius: 8,
          borderCurve: 'continuous',
          borderWidth: 1,
          borderColor: accent.border,
          backgroundColor: palette.surface,
          padding: 16,
        }}>
        <View style={{ gap: 8 }}>
          <Text selectable style={{ color: palette.ink, fontSize: 18, fontWeight: '800' }}>
            Lens Type
          </Text>
          <SegmentedControl options={lensOptions} value={lensType} disabled={isBusy} onChange={setLensType} />
        </View>

        <View style={{ gap: 6 }}>
          <Text selectable style={{ color: palette.muted, fontSize: 14, fontWeight: '700' }}>
            Replacement date
          </Text>
          <Text selectable style={{ color: palette.ink, fontSize: 17, fontWeight: '800' }}>
            {formatShortDate(expiresAt)}
          </Text>
          <Text selectable style={{ color: palette.muted, fontSize: 14 }}>
            Based on a {displayLensType(lensType)} lens opened today.
          </Text>
        </View>

        <View style={{ gap: 8 }}>
          <Text selectable style={{ color: palette.muted, fontSize: 14, fontWeight: '700' }}>
            Notes
          </Text>
          <TextInput
            placeholder="Optional"
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
              padding: 12,
              color: palette.ink,
            }}
          />
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <ActionButton label={activeLens ? 'Replace Lens' : 'Open Lens'} tone="primary" disabled={isBusy} onPress={save} />
          <ActionButton label="Cancel" disabled={isBusy} onPress={() => router.back()} />
        </View>
      </View>
    </ScrollView>
  );
}
