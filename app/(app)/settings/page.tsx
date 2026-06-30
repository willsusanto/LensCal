"use client";

import { Bell, Minus, Plus, RefreshCw, Settings } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { SegmentedControl } from "@/components/segmented-control";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { formatReminderTime } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { useLens } from "@/providers/lens-provider";
import type { LensType } from "@/types/lens";

const lensOptions: { label: string; value: LensType }[] = [
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
];

function SectionIcon({ icon: Icon }: { icon: typeof Bell }) {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surfaceBlue text-blueDeep">
      <Icon size={20} />
    </div>
  );
}

function Stepper({
  label,
  value,
  onDecrease,
  onIncrease,
  disabled,
  wideValue,
}: {
  label: string;
  value: string;
  onDecrease: () => void;
  onIncrease: () => void;
  disabled?: boolean;
  wideValue?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label className="block">{label}</Label>
      <div className="grid w-fit max-w-full grid-cols-[2.75rem_minmax(4rem,max-content)_2.75rem] items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onDecrease}
          disabled={disabled}
          aria-label={`Decrease ${label}`}
          className="h-11 w-11 rounded-lg text-ink"
        >
          <Minus size={17} />
        </Button>
        <span
          className={cn(
            "flex h-11 items-center justify-center rounded-lg border border-line bg-surface px-3 text-base font-black tabular-nums text-ink sm:text-lg",
            wideValue ? "min-w-[7.5rem]" : "min-w-16",
          )}
        >
          {value}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onIncrease}
          disabled={disabled}
          aria-label={`Increase ${label}`}
          className="h-11 w-11 rounded-lg text-ink"
        >
          <Plus size={17} />
        </Button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { settings, updateSetting, signOut, isBusy } = useLens();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Settings"
        title="Preferences"
        description="Tune replacement cycles, reminder timing, and account access."
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex-row items-center gap-3">
              <SectionIcon icon={RefreshCw} />
              <div>
                <CardTitle>Default lens type</CardTitle>
                <p className="mt-1 text-sm font-bold text-muted">Used when opening a new lens pack.</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <SegmentedControl
                options={lensOptions}
                value={settings.defaultLensType}
                onChange={(value) => updateSetting("defaultLensType", value)}
                disabled={isBusy}
              />

              {settings.defaultLensType === "monthly" && (
                <Stepper
                  label="Replacement cycle"
                  value={`${settings.monthlyReplacementDays} days`}
                  disabled={isBusy}
                  wideValue
                  onDecrease={() =>
                    updateSetting("monthlyReplacementDays", Math.max(1, settings.monthlyReplacementDays - 1))
                  }
                  onIncrease={() =>
                    updateSetting("monthlyReplacementDays", Math.min(90, settings.monthlyReplacementDays + 1))
                  }
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center gap-3">
              <SectionIcon icon={Bell} />
              <div>
                <CardTitle>Reminders</CardTitle>
                <p className="mt-1 text-sm font-bold text-muted">Choose when replacement reminders should arrive.</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between gap-4 rounded-lg border border-line bg-surfaceSoft p-4 sm:px-5">
                <div className="min-w-0">
                  <p className="text-sm font-black text-ink">Replacement reminders</p>
                  <p className="mt-1 text-xs font-bold text-muted">
                    {settings.notificationsEnabled ? "Enabled" : "Disabled"}
                  </p>
                </div>
                <Switch
                  className="shrink-0"
                  checked={settings.notificationsEnabled}
                  onCheckedChange={(checked) => updateSetting("notificationsEnabled", checked)}
                  disabled={isBusy}
                  aria-label="Toggle replacement reminders"
                />
              </div>

              {settings.notificationsEnabled && (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-[auto_auto_auto] sm:items-end">
                    <Stepper
                      label="Hour"
                      value={String(settings.reminderHour).padStart(2, "0")}
                      disabled={isBusy}
                      onDecrease={() => updateSetting("reminderHour", (settings.reminderHour + 23) % 24)}
                      onIncrease={() => updateSetting("reminderHour", (settings.reminderHour + 1) % 24)}
                    />
                    <span className="hidden pb-2 text-2xl font-black text-muted sm:block">:</span>
                    <Stepper
                      label="Minute"
                      value={String(settings.reminderMinute).padStart(2, "0")}
                      disabled={isBusy}
                      onDecrease={() => updateSetting("reminderMinute", (settings.reminderMinute + 55) % 60)}
                      onIncrease={() => updateSetting("reminderMinute", (settings.reminderMinute + 5) % 60)}
                    />
                  </div>

                  <p className="text-sm font-bold text-muted">
                    Reminders at {formatReminderTime(settings.reminderHour, settings.reminderMinute)}
                  </p>

                  <div className="rounded-lg border border-line bg-warningBg px-4 py-3">
                    <p className="text-sm font-bold text-warning">
                      Web Push notifications are not implemented yet. This setting will take effect in a future update.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader className="flex-row items-center gap-3">
            <SectionIcon icon={Settings} />
            <div>
              <CardTitle>Account</CardTitle>
              <p className="mt-1 text-sm font-bold text-muted">Session and access controls.</p>
            </div>
          </CardHeader>
          <CardContent>
            <Button
              type="button"
              variant="destructive"
              onClick={signOut}
              disabled={isBusy}
              className="w-full"
            >
              Sign out
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
