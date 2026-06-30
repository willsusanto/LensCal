import { useState } from 'react';
import { Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { SegmentedControl } from '@/components/segmented-control';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { palette } from '@/constants/palette';
import { displayLensType, formatReminderTime } from '@/lib/date-utils';
import { useLens } from '@/providers/lens-provider';
import type { LensType } from '@/types/lens';

const lensOptions: { label: string; value: LensType }[] = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
];

function SectionTitle({ icon, title }: { icon: 'calendar' | 'bell.fill' | 'arrow.triangle.2.circlepath'; title: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 19,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: palette.surfaceBlue,
        }}>
        <IconSymbol name={icon} color={palette.black} size={22} />
      </View>
      <Text selectable style={{ color: palette.ink, fontSize: 18, fontWeight: '900' }}>
        {title}
      </Text>
    </View>
  );
}

function Stepper({
  label,
  value,
  onDecrease,
  onIncrease,
}: {
  label: string;
  value: string;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text selectable style={{ color: palette.muted, fontSize: 14, fontWeight: '700' }}>
        {label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Pressable
          accessibilityRole="button"
          onPress={onDecrease}
          style={{
            width: 44,
            height: 44,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 8,
            borderCurve: 'continuous',
            borderWidth: 1,
            borderColor: palette.line,
            backgroundColor: palette.surface,
          }}>
          <Text style={{ color: palette.ink, fontSize: 24, fontWeight: '800' }}>-</Text>
        </Pressable>
        <Text
          selectable
          style={{
            minWidth: 64,
            textAlign: 'center',
            color: palette.ink,
            fontSize: 20,
            fontWeight: '800',
            fontVariant: ['tabular-nums'],
          }}>
          {value}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={onIncrease}
          style={{
            width: 44,
            height: 44,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 8,
            borderCurve: 'continuous',
            borderWidth: 1,
            borderColor: palette.line,
            backgroundColor: palette.surface,
          }}>
          <Text style={{ color: palette.ink, fontSize: 24, fontWeight: '800' }}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const {
    settings,
    updateSetting,
    isBusy,
    isSupabaseConfigured,
    session,
    signIn,
    signUp,
    signOut,
    syncNow,
    syncMessage,
  } = useLens();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: palette.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: 112, gap: 16 }}>
      <View style={{ gap: 4 }}>
        <Text selectable style={{ color: palette.ink, fontSize: 34, fontWeight: '900' }}>
          Settings
        </Text>
        <Text selectable style={{ color: palette.muted, fontSize: 15 }}>
          Defaults, reminders, and device sync.
        </Text>
      </View>

      <View
        style={{
          gap: 14,
          borderRadius: 8,
          borderCurve: 'continuous',
          borderWidth: 1,
          borderColor: palette.line,
          backgroundColor: palette.surface,
          padding: 16,
        }}>
        <SectionTitle icon="calendar" title="Lens Defaults" />
        <SegmentedControl
          options={lensOptions}
          value={settings.defaultLensType}
          disabled={isBusy}
          onChange={(value) => updateSetting('defaultLensType', value)}
        />
        <Stepper
          label="Monthly Days"
          value={String(settings.monthlyReplacementDays)}
          onDecrease={() =>
            updateSetting('monthlyReplacementDays', Math.max(1, settings.monthlyReplacementDays - 1))
          }
          onIncrease={() =>
            updateSetting('monthlyReplacementDays', Math.min(365, settings.monthlyReplacementDays + 1))
          }
        />
        <Text selectable style={{ color: palette.muted, fontSize: 14 }}>
          New {displayLensType(settings.defaultLensType)} lenses use this default.
        </Text>
      </View>

      <View
        style={{
          gap: 14,
          borderRadius: 8,
          borderCurve: 'continuous',
          borderWidth: 1,
          borderColor: palette.line,
          backgroundColor: palette.surface,
          padding: 16,
        }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ flexShrink: 1, gap: 4 }}>
            <SectionTitle icon="bell.fill" title="Local Reminders" />
            <Text selectable style={{ color: palette.muted, fontSize: 14 }}>
              Scheduled on each device at {formatReminderTime(settings.reminderHour, settings.reminderMinute)}.
            </Text>
          </View>
          <Switch
            value={settings.notificationsEnabled}
            disabled={isBusy}
            onValueChange={(value) => updateSetting('notificationsEnabled', value)}
          />
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 18 }}>
          <Stepper
            label="Hour"
            value={String(settings.reminderHour).padStart(2, '0')}
            onDecrease={() =>
              updateSetting('reminderHour', (settings.reminderHour + 23) % 24)
            }
            onIncrease={() =>
              updateSetting('reminderHour', (settings.reminderHour + 1) % 24)
            }
          />
          <Stepper
            label="Minute"
            value={String(settings.reminderMinute).padStart(2, '0')}
            onDecrease={() =>
              updateSetting('reminderMinute', (settings.reminderMinute + 55) % 60)
            }
            onIncrease={() =>
              updateSetting('reminderMinute', (settings.reminderMinute + 5) % 60)
            }
          />
        </View>
      </View>

      <View
        style={{
          gap: 14,
          borderRadius: 8,
          borderCurve: 'continuous',
          borderWidth: 1,
          borderColor: palette.line,
          backgroundColor: palette.surface,
          padding: 16,
        }}>
        <SectionTitle icon="arrow.triangle.2.circlepath" title="Supabase Sync" />

        {!isSupabaseConfigured ? (
          <Text selectable style={{ color: palette.warning, fontSize: 14, fontWeight: '700' }}>
            Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to enable auth and sync.
          </Text>
        ) : session ? (
          <>
            <Text selectable style={{ color: palette.muted, fontSize: 14 }}>
              Signed in as {session.user.email ?? session.user.id}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <ActionButton label="Sync Now" tone="primary" disabled={isBusy} onPress={() => syncNow()} />
              <ActionButton label="Sign Out" disabled={isBusy} onPress={signOut} />
            </View>
          </>
        ) : (
          <>
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              style={{
                minHeight: 46,
                borderRadius: 8,
                borderCurve: 'continuous',
                borderWidth: 1,
                borderColor: palette.line,
                paddingHorizontal: 12,
                color: palette.ink,
              }}
            />
            <TextInput
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={{
                minHeight: 46,
                borderRadius: 8,
                borderCurve: 'continuous',
                borderWidth: 1,
                borderColor: palette.line,
                paddingHorizontal: 12,
                color: palette.ink,
              }}
            />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <ActionButton
                label="Sign In"
                tone="primary"
                disabled={isBusy || !email || !password}
                onPress={() => signIn(email, password)}
              />
              <ActionButton
                label="Create Account"
                disabled={isBusy || !email || !password}
                onPress={() => signUp(email, password)}
              />
            </View>
          </>
        )}

        {syncMessage ? (
          <Text selectable style={{ color: palette.muted, fontSize: 14 }}>
            {syncMessage}
          </Text>
        ) : null}
      </View>
    </ScrollView>
  );
}
