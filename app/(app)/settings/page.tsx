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
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { PageHeader } from "@/components/page-header";
import { SegmentedControl } from "@/components/segmented-control";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  ensureNotificationPermissions,
  getNotificationSupportState,
  showTestNotification,
  type NotificationSupportState,
} from "@/lib/notifications";
import { formatReminderTime } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { useLens } from "@/providers/lens-provider";
import type { LensType } from "@/types/lens";

const lensOptions: { label: string; value: LensType }[] = [
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
];

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

export default function SettingsPage() {
  const { settings, updateSetting, signOut, isBusy } = useLens();
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
      return;
    }

    const isAllowed = await ensureNotificationPermissions();
    const nextState = getNotificationSupportState();
    setNotificationState(nextState);

    await updateSetting("notificationsEnabled", isAllowed);
    setNotificationMessage(
      isAllowed
        ? "Browser notifications are enabled for this device."
        : "Notifications were not allowed in this browser.",
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
