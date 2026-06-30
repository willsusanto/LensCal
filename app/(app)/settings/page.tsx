'use client';

import { Bell, RefreshCw, Settings } from 'lucide-react';

import { SegmentedControl } from '@/components/segmented-control';
import { Card } from '@/components/ui/primitives';
import { palette } from '@/constants/palette';
import { formatReminderTime } from '@/lib/date-utils';
import { useLens } from '@/providers/lens-provider';
import type { LensType } from '@/types/lens';

const lensOptions: { label: string; value: LensType }[] = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
];

function SectionTitle({ icon: Icon, title }: { icon: typeof Bell; title: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="w-[38px] h-[38px] rounded-full flex items-center justify-center shrink-0"
        style={{ backgroundColor: palette.surfaceBlue }}
      >
        <Icon size={20} color={palette.black} />
      </div>
      <p className="text-[17px] font-black" style={{ color: palette.ink }}>{title}</p>
    </div>
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
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-extrabold uppercase" style={{ color: palette.muted }}>{label}</p>
      <div className="flex items-center gap-2">
        <button
          onClick={onDecrease}
          className="w-10 h-10 flex items-center justify-center rounded-lg border text-2xl font-extrabold"
          style={{ borderColor: palette.line, backgroundColor: palette.surface, color: palette.ink }}
        >
          −
        </button>
        <span
          className="min-w-[56px] text-center text-xl font-black tabular-nums"
          style={{ color: palette.ink }}
        >
          {value}
        </span>
        <button
          onClick={onIncrease}
          className="w-10 h-10 flex items-center justify-center rounded-lg border text-2xl font-extrabold"
          style={{ borderColor: palette.line, backgroundColor: palette.surface, color: palette.ink }}
        >
          +
        </button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { settings, updateSetting, signOut, isBusy } = useLens();

  return (
    <div className="flex flex-col gap-4 px-4 pb-6">
      {/* Header */}
      <div
        className="sticky top-0 z-10 -mx-4 px-4 pt-4 pb-3"
        style={{ backgroundColor: palette.background }}
      >
        <h1 className="text-[28px] font-black" style={{ color: palette.ink }}>Settings</h1>
        <p className="text-sm font-bold" style={{ color: palette.muted }}>
          Customise your lens tracking.
        </p>
      </div>

      {/* Lens type */}
      <Card style={{ gap: 14 }}>
        <SectionTitle icon={RefreshCw} title="Default lens type" />
        <SegmentedControl
          options={lensOptions}
          value={settings.defaultLensType}
          onChange={(v) => updateSetting('defaultLensType', v)}
          disabled={isBusy}
        />
        {settings.defaultLensType === 'monthly' && (
          <Stepper
            label="Replacement cycle (days)"
            value={String(settings.monthlyReplacementDays)}
            onDecrease={() => updateSetting('monthlyReplacementDays', Math.max(1, settings.monthlyReplacementDays - 1))}
            onIncrease={() => updateSetting('monthlyReplacementDays', Math.min(90, settings.monthlyReplacementDays + 1))}
          />
        )}
      </Card>

      {/* Notifications */}
      <Card style={{ gap: 14 }}>
        <SectionTitle icon={Bell} title="Reminders" />

        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold" style={{ color: palette.ink }}>Replacement reminders</p>
            <p className="text-xs font-bold" style={{ color: palette.muted }}>
              {settings.notificationsEnabled ? 'Enabled' : 'Disabled'}
            </p>
          </div>
          <input
            type="checkbox"
            role="switch"
            checked={settings.notificationsEnabled}
            onChange={(e) => updateSetting('notificationsEnabled', e.target.checked)}
            disabled={isBusy}
            className="w-10 h-6 cursor-pointer accent-black"
          />
        </div>

        {settings.notificationsEnabled && (
          <div className="flex flex-col gap-3">
            <p className="text-xs font-extrabold uppercase" style={{ color: palette.muted }}>Reminder time</p>
            <div className="flex items-center gap-3">
              <Stepper
                label="Hour"
                value={String(settings.reminderHour).padStart(2, '0')}
                onDecrease={() => updateSetting('reminderHour', (settings.reminderHour + 23) % 24)}
                onIncrease={() => updateSetting('reminderHour', (settings.reminderHour + 1) % 24)}
              />
              <span className="text-2xl font-black mt-4" style={{ color: palette.muted }}>:</span>
              <Stepper
                label="Minute"
                value={String(settings.reminderMinute).padStart(2, '0')}
                onDecrease={() => updateSetting('reminderMinute', (settings.reminderMinute + 55) % 60)}
                onIncrease={() => updateSetting('reminderMinute', (settings.reminderMinute + 5) % 60)}
              />
            </div>
            <p className="text-sm font-bold" style={{ color: palette.muted }}>
              Reminders at {formatReminderTime(settings.reminderHour, settings.reminderMinute)}
            </p>
            <div
              className="rounded-lg px-3 py-2"
              style={{ backgroundColor: palette.warningBg }}
            >
              <p className="text-xs font-bold" style={{ color: palette.warning }}>
                Web Push notifications not yet implemented. This setting will take effect in a future update.
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* Account */}
      <Card style={{ gap: 14 }}>
        <SectionTitle icon={Settings} title="Account" />
        <button
          onClick={signOut}
          disabled={isBusy}
          className="w-full min-h-[44px] flex items-center justify-center rounded-full border text-sm font-black"
          style={{
            borderColor: palette.line,
            backgroundColor: palette.surface,
            color: palette.danger,
            opacity: isBusy ? 0.45 : undefined,
          }}
        >
          Sign out
        </button>
      </Card>
    </div>
  );
}

