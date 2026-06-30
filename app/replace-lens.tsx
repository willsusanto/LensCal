import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/action-button';
import { Text, TextInput } from '@/components/app-text';
import { AnimatedPressable } from '@/components/animated-pressable';
import { SegmentedControl } from '@/components/segmented-control';
import { palette } from '@/constants/palette';
import {
  displayLensType,
  expirationFor,
  formatShortDate,
  replacementDaysFor,
  startOfLocalDay,
} from '@/lib/date-utils';
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

export default function ReplaceLensScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ eye?: string }>();
  const eye = normalizeEye(params.eye);
  const { currentDate, settings, replaceLens, isBusy, eyes } = useLens();
  const [lensType, setLensType] = useState<LensType>(settings.defaultLensType);
  const [startDate, setStartDate] = useState(startOfLocalDay(currentDate));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [notes, setNotes] = useState('');
  const activeLens = eyes[eye].activeLens;
  const expiresAt = expirationFor(startDate, lensType, settings.monthlyReplacementDays);
  const replacementDays = replacementDaysFor(lensType, settings.monthlyReplacementDays);
  const insets = useSafeAreaInsets();

  async function save() {
    await lightTap();
    await replaceLens(eye, lensType, notes.trim() || null, startDate);
    router.back();
  }

  function handleStartDateChange(event: DateTimePickerEvent, selectedDate?: Date) {
    if (process.env.EXPO_OS === 'android') {
      setShowDatePicker(false);
    }

    if (event.type === 'dismissed' || !selectedDate) {
      return;
    }

    setStartDate(startOfLocalDay(selectedDate));
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: palette.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 12, gap: 16 }}>
      <View style={{ gap: 6 }}>
        <Text selectable style={{ color: palette.ink, fontSize: 30, fontWeight: '900' }}>
          {activeLens ? 'Change' : 'Open'} {eye === 'left' ? 'Left' : 'Right'}
        </Text>
        <Text selectable style={{ color: palette.muted, fontSize: 14, lineHeight: 21, fontWeight: '700' }}>
          Set the cycle for this lens.
        </Text>
      </View>

      <View
        style={{
          borderRadius: 8,
          borderCurve: 'continuous',
          borderWidth: 1,
          borderColor: palette.line,
          backgroundColor: palette.surface,
          padding: 16,
          gap: 5,
        }}>
        <Text selectable style={{ color: palette.muted, fontSize: 12, fontWeight: '900' }}>
          START DATE
        </Text>
        <AnimatedPressable
          accessibilityRole="button"
          onPress={async () => {
            await lightTap();
            setShowDatePicker((visible) => !visible);
          }}
          style={{
            minHeight: 54,
            borderRadius: 8,
            borderCurve: 'continuous',
            borderWidth: 1,
            borderColor: showDatePicker ? palette.lineStrong : palette.line,
            backgroundColor: palette.surfaceSoft,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            paddingHorizontal: 12,
          }}>
          <View style={{ gap: 2 }}>
            <Text selectable style={{ color: palette.ink, fontSize: 22, fontWeight: '900' }}>
              {formatShortDate(startDate)}
            </Text>
            <Text selectable style={{ color: palette.muted, fontSize: 12, fontWeight: '800' }}>
              Tap to change
            </Text>
          </View>
          <View
            style={{
              borderRadius: 999,
              backgroundColor: palette.surfaceBlue,
              paddingHorizontal: 10,
              paddingVertical: 6,
            }}>
            <Text selectable style={{ color: palette.blueDeep, fontSize: 12, fontWeight: '900' }}>
              EDIT
            </Text>
          </View>
        </AnimatedPressable>

        {showDatePicker ? (
          process.env.EXPO_OS === 'ios' ? (
            <View
              style={{
                borderRadius: 8,
                borderCurve: 'continuous',
                borderWidth: 1,
                borderColor: palette.line,
                backgroundColor: palette.surfaceSoft,
                overflow: 'hidden',
              }}>
              <DateTimePicker
                value={startDate}
                mode="date"
                display="spinner"
                onChange={handleStartDateChange}
                style={{ alignSelf: 'stretch' }}
              />
            </View>
          ) : process.env.EXPO_OS === 'android' ? (
            <DateTimePicker
              value={startDate}
              mode="date"
              display="default"
              onChange={handleStartDateChange}
            />
          ) : (
            <View
              style={{
                minHeight: 50,
                borderRadius: 8,
                borderCurve: 'continuous',
                borderWidth: 1,
                borderColor: palette.line,
                backgroundColor: palette.surfaceSoft,
                justifyContent: 'center',
                paddingHorizontal: 12,
              }}>
              <Text selectable style={{ color: palette.ink, fontSize: 22, fontWeight: '900' }}>
                {formatShortDate(startDate)}
              </Text>
            </View>
          )
        ) : null}
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
