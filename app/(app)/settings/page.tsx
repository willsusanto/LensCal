"use client";

import {
  Bell,
  BellRing,
  CheckCircle2,
  Download,
  Minus,
  Plus,
  RefreshCw,
  Send,
  Settings,
  Smartphone,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { PageHeader } from "@/components/page-header";
import { SegmentedControl } from "@/components/segmented-control";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  DEFAULT_NOTIFICATION_REMINDERS,
  LENS_TYPE_OPTIONS,
  MAX_NOTIFICATION_REMINDERS,
  SETTINGS_LIMITS,
  normalizeNotificationReminders,
} from "@/constants/lens";
import {
  ensureNotificationPermissions,
  getNotificationSupportState,
  showTestNotification,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  type NotificationSupportState,
} from "@/lib/notifications";
import { formatNotificationReminder } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { useLens } from "@/providers/lens-provider";
import type { NotificationReminder } from "@/types/lens";

type BeforeInstallPromptEvent = Event & {
  platforms: string[];
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt: () => Promise<void>;
};

function isStandaloneDisplay() {
  if (typeof window === "undefined") return false;

  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || navigatorWithStandalone.standalone === true;
}

function usePwaInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(() => isStandaloneDisplay());

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    const handleInstalled = () => {
      setInstallPrompt(null);
      setIsInstalled(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const install = async () => {
    if (!installPrompt) return;

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);

    if (choice.outcome === "accepted") {
      setIsInstalled(true);
    }
  };

  return {
    canInstall: Boolean(installPrompt),
    install,
    isInstalled,
  };
}

function permissionLabel(state: NotificationSupportState) {
  switch (state) {
    case "granted":
      return "Allowed";
    case "denied":
      return "Blocked";
    case "default":
      return "Not set";
    case "unsupported":
      return "Unsupported";
  }
}

function SectionIcon({ icon: Icon }: { icon: LucideIcon }) {
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

function reminderKey(reminder: NotificationReminder) {
  return `${reminder.daysBefore}:${reminder.hour}:${reminder.minute}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function timeInputValue(reminder: NotificationReminder) {
  return `${String(reminder.hour).padStart(2, "0")}:${String(reminder.minute).padStart(2, "0")}`;
}

function parseTimeInputValue(value: string) {
  const [hourText, minuteText] = value.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < SETTINGS_LIMITS.reminderHour.min ||
    hour > SETTINGS_LIMITS.reminderHour.max ||
    minute < SETTINGS_LIMITS.reminderMinute.min ||
    minute > SETTINGS_LIMITS.reminderMinute.max
  ) {
    return null;
  }

  return { hour, minute };
}

function nextReminderCandidate(reminders: NotificationReminder[]) {
  const existing = new Set(reminders.map(reminderKey));
  const base = reminders[reminders.length - 1] ?? DEFAULT_NOTIFICATION_REMINDERS[0];
  const dayCandidates = [base.daysBefore + 1, 0, 1, 2, 3];

  for (const daysBefore of dayCandidates) {
    if (
      daysBefore < SETTINGS_LIMITS.reminderDaysBefore.min ||
      daysBefore > SETTINGS_LIMITS.reminderDaysBefore.max
    ) {
      continue;
    }

    const candidate = { ...base, daysBefore };
    if (!existing.has(reminderKey(candidate))) return candidate;
  }

  for (let hour = SETTINGS_LIMITS.reminderHour.min; hour <= SETTINGS_LIMITS.reminderHour.max; hour += 1) {
    const candidate = { daysBefore: base.daysBefore, hour, minute: base.minute };
    if (!existing.has(reminderKey(candidate))) return candidate;
  }

  return DEFAULT_NOTIFICATION_REMINDERS[0];
}

export default function SettingsPage() {
  const { settings, updateSetting, savePushSubscription, revokePushSubscription, signOut, isBusy } = useLens();
  const pwaInstall = usePwaInstallPrompt();
  const [notificationState, setNotificationState] = useState<NotificationSupportState>(() =>
    getNotificationSupportState(),
  );
  const [notificationMessage, setNotificationMessage] = useState<string | null>(null);
  const [isTestingNotification, setIsTestingNotification] = useState(false);

  const handleReminderToggle = async (checked: boolean) => {
    setNotificationMessage(null);

    if (!checked) {
      await updateSetting("notificationsEnabled", false);
      const endpoint = await unsubscribeFromPushNotifications();
      await revokePushSubscription(endpoint);
      return;
    }

    const isAllowed = await ensureNotificationPermissions();
    const nextState = getNotificationSupportState();
    setNotificationState(nextState);

    if (!isAllowed) {
      await updateSetting("notificationsEnabled", false);
      setNotificationMessage("Notifications were not allowed in this browser.");
      return;
    }

    const subscription = await subscribeToPushNotifications();
    if (!subscription) {
      await updateSetting("notificationsEnabled", false);
      setNotificationMessage(
        "Background reminders could not be enabled. Check the VAPID public key and service worker setup.",
      );
      return;
    }

    await savePushSubscription(subscription);
    await updateSetting("notificationsEnabled", true);
    setNotificationMessage(
      "Background reminders are enabled for this device.",
    );
  };

  const handleTestNotification = async () => {
    setIsTestingNotification(true);
    setNotificationMessage(null);

    try {
      const didShow = await showTestNotification();
      setNotificationState(getNotificationSupportState());
      setNotificationMessage(
        didShow
          ? "Test notification sent."
          : "Test notification could not be shown. Check browser permissions.",
      );
    } finally {
      setIsTestingNotification(false);
    }
  };

  const saveNotificationReminders = (reminders: NotificationReminder[]) =>
    updateSetting("notificationReminders", normalizeNotificationReminders(reminders, []));

  const updateReminder = (index: number, changes: Partial<NotificationReminder>) => {
    const nextReminders = settings.notificationReminders.map((reminder, reminderIndex) =>
      reminderIndex === index ? { ...reminder, ...changes } : reminder,
    );
    void saveNotificationReminders(nextReminders);
  };

  const addReminder = () => {
    if (settings.notificationReminders.length >= MAX_NOTIFICATION_REMINDERS) return;
    void saveNotificationReminders([...settings.notificationReminders, nextReminderCandidate(settings.notificationReminders)]);
  };

  const removeReminder = (index: number) => {
    void saveNotificationReminders(settings.notificationReminders.filter((_, reminderIndex) => reminderIndex !== index));
  };

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
                options={LENS_TYPE_OPTIONS}
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
                    updateSetting(
                      "monthlyReplacementDays",
                      Math.max(SETTINGS_LIMITS.monthlyReplacementDays.min, settings.monthlyReplacementDays - 1),
                    )
                  }
                  onIncrease={() =>
                    updateSetting(
                      "monthlyReplacementDays",
                      Math.min(SETTINGS_LIMITS.monthlyReplacementDays.max, settings.monthlyReplacementDays + 1),
                    )
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
                    Browser permission: {permissionLabel(notificationState)}
                  </p>
                </div>
                <Switch
                  className="shrink-0"
                  checked={settings.notificationsEnabled && notificationState === "granted"}
                  onCheckedChange={handleReminderToggle}
                  disabled={isBusy || notificationState === "unsupported"}
                  aria-label="Toggle replacement reminders"
                />
              </div>

              {settings.notificationsEnabled && notificationState === "granted" && (
                <div className="space-y-4">
                  <div className="space-y-3">
                    {settings.notificationReminders.length === 0 && (
                      <div className="rounded-lg border border-dashed border-line bg-surface px-4 py-3">
                        <p className="text-sm font-bold text-muted">No notification rows saved.</p>
                      </div>
                    )}

                    {settings.notificationReminders.map((reminder, index) => (
                      <div
                        key={`${index}-${reminderKey(reminder)}`}
                        className="grid gap-3 rounded-lg border border-line bg-surface p-3 sm:grid-cols-[minmax(8rem,1fr)_6.25rem_6rem_auto_8rem_2.75rem] sm:items-end"
                      >
                        <div className="space-y-2">
                          <Label htmlFor={`reminder-type-${index}`}>Alert</Label>
                          <select
                            id={`reminder-type-${index}`}
                            defaultValue="notification"
                            disabled={isBusy}
                            aria-label="Reminder type"
                            className="block h-11 w-full min-w-0 rounded-lg border border-line bg-surface px-3 py-2 text-sm font-bold text-ink outline-none transition-colors focus:border-blueDeep focus:ring-2 focus:ring-blueDeep/20 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <option value="notification">Notification</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`reminder-days-${index}`}>Before</Label>
                          <Input
                            id={`reminder-days-${index}`}
                            type="number"
                            min={SETTINGS_LIMITS.reminderDaysBefore.min}
                            max={SETTINGS_LIMITS.reminderDaysBefore.max}
                            step={1}
                            inputMode="numeric"
                            value={reminder.daysBefore}
                            onChange={(event) => {
                              const daysBefore = Number(event.currentTarget.value);
                              if (!Number.isFinite(daysBefore)) return;

                              updateReminder(index, {
                                daysBefore: clamp(
                                  Math.round(daysBefore),
                                  SETTINGS_LIMITS.reminderDaysBefore.min,
                                  SETTINGS_LIMITS.reminderDaysBefore.max,
                                ),
                              });
                            }}
                            disabled={isBusy}
                            className="tabular-nums"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`reminder-unit-${index}`}>Unit</Label>
                          <select
                            id={`reminder-unit-${index}`}
                            defaultValue="days"
                            disabled={isBusy}
                            aria-label="Reminder unit"
                            className="block h-11 w-full min-w-0 rounded-lg border border-line bg-surface px-3 py-2 text-sm font-bold text-ink outline-none transition-colors focus:border-blueDeep focus:ring-2 focus:ring-blueDeep/20 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <option value="days">days</option>
                          </select>
                        </div>

                        <p className="pb-3 text-sm font-black text-muted sm:whitespace-nowrap sm:text-center">before at</p>

                        <div className="space-y-2">
                          <Label htmlFor={`reminder-time-${index}`}>Time</Label>
                          <Input
                            id={`reminder-time-${index}`}
                            type="time"
                            step={SETTINGS_LIMITS.reminderMinute.step * 60}
                            value={timeInputValue(reminder)}
                            onChange={(event) => {
                              const time = parseTimeInputValue(event.currentTarget.value);
                              if (time) updateReminder(index, time);
                            }}
                            disabled={isBusy}
                            className="tabular-nums"
                          />
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeReminder(index)}
                          disabled={isBusy}
                          aria-label="Remove reminder"
                          className="h-11 w-11 text-muted hover:text-ink"
                        >
                          <X size={18} />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <p className="text-sm font-bold text-muted">
                    {settings.notificationReminders.length > 0
                      ? `Saved reminders: ${settings.notificationReminders.map(formatNotificationReminder).join(", ")}`
                      : "Saved reminders: none"}
                  </p>

                  <Button
                    type="button"
                    variant="soft"
                    onClick={addReminder}
                    disabled={isBusy || settings.notificationReminders.length >= MAX_NOTIFICATION_REMINDERS}
                    className="w-full sm:w-auto"
                  >
                    <Plus size={16} />
                    Add notification
                  </Button>
                </div>
              )}

              <div className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-black text-ink">Notification test</p>
                  <p className="mt-1 text-xs font-bold text-muted">Sends one notification to this browser.</p>
                </div>
                <Button
                  type="button"
                  variant="soft"
                  onClick={handleTestNotification}
                  disabled={isBusy || isTestingNotification || notificationState === "unsupported"}
                  className="w-full sm:w-auto"
                >
                  <Send size={16} />
                  Send test
                </Button>
              </div>

              {notificationMessage && (
                <div className="rounded-lg border border-line bg-surfaceSoft px-4 py-3">
                  <p className="text-sm font-bold text-muted">{notificationMessage}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="h-fit">
            <CardHeader className="flex-row items-center gap-3">
              <SectionIcon icon={Smartphone} />
              <div>
                <CardTitle>Install app</CardTitle>
                <p className="mt-1 text-sm font-bold text-muted">Run LensCal from your device home screen.</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg border border-line bg-surfaceSoft p-4">
                {pwaInstall.isInstalled ? (
                  <CheckCircle2 className="shrink-0 text-blueDeep" size={20} />
                ) : (
                  <BellRing className="shrink-0 text-blueDeep" size={20} />
                )}
                <p className="text-sm font-bold text-muted">
                  {pwaInstall.isInstalled
                    ? "LensCal is installed on this device."
                    : pwaInstall.canInstall
                      ? "This browser can install LensCal."
                      : "Use the browser install or add-to-home-screen option when available."}
                </p>
              </div>

              <Button
                type="button"
                variant="default"
                onClick={pwaInstall.install}
                disabled={isBusy || pwaInstall.isInstalled || !pwaInstall.canInstall}
                className="w-full"
              >
                <Download size={16} />
                {pwaInstall.isInstalled ? "Installed" : "Install LensCal"}
              </Button>
            </CardContent>
          </Card>

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
    </div>
  );
}
