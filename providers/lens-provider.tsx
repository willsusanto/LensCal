import type { Session } from '@supabase/supabase-js';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  discardLens as discardLensInDb,
  getActiveLenses,
  getEvents,
  getLensHistory,
  getSettings,
  initDatabase,
  insertEvent,
  openLens,
  setLensNotificationId,
  updateSetting as updateSettingInDb,
} from '@/lib/local-db';
import { cancelLensNotification, scheduleReplacementNotification } from '@/lib/notifications';
import { addDays } from '@/lib/date-utils';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { syncWithSupabase } from '@/lib/sync';
import type { AppSettings, Eye, EyeState, LensEvent, LensType, LensUsage } from '@/types/lens';

type SyncSummary = {
  pushedUsages: number;
  pushedEvents: number;
  pulledUsages: number;
  pulledEvents: number;
};

type LensContextValue = {
  isReady: boolean;
  isBusy: boolean;
  settings: AppSettings;
  currentDate: Date;
  testDateOffsetDays: number;
  eyes: Record<Eye, EyeState>;
  history: LensUsage[];
  events: LensEvent[];
  session: Session | null;
  isSupabaseConfigured: boolean;
  syncMessage: string | null;
  refresh: () => Promise<void>;
  advanceTestDay: () => void;
  resetTestDate: () => void;
  replaceLens: (eye: Eye, lensType: LensType, notes?: string | null, openedAt?: Date) => Promise<void>;
  discardLens: (eye: Eye) => Promise<void>;
  markUncomfortable: (eye: Eye, notes?: string | null) => Promise<void>;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  syncNow: () => Promise<SyncSummary | null>;
};

const defaultSettings: AppSettings = {
  defaultLensType: 'monthly',
  monthlyReplacementDays: 28,
  notificationsEnabled: true,
  reminderHour: 8,
  reminderMinute: 0,
};

const emptyEye = (eye: Eye): EyeState => ({
  eye,
  activeLens: null,
  latestUncomfortableEvent: null,
});

const LensContext = createContext<LensContextValue | null>(null);

export function LensProvider({ children }: PropsWithChildren) {
  const [isReady, setIsReady] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [activeLenses, setActiveLenses] = useState<LensUsage[]>([]);
  const [history, setHistory] = useState<LensUsage[]>([]);
  const [events, setEvents] = useState<LensEvent[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [testDateOffsetDays, setTestDateOffsetDays] = useState(0);
  const currentDate = useMemo(() => addDays(new Date(), testDateOffsetDays), [testDateOffsetDays]);

  const refresh = useCallback(async () => {
    const [nextSettings, nextActiveLenses, nextHistory, nextEvents] = await Promise.all([
      getSettings(),
      getActiveLenses(),
      getLensHistory(),
      getEvents(),
    ]);

    setSettings(nextSettings);
    setActiveLenses(nextActiveLenses);
    setHistory(nextHistory);
    setEvents(nextEvents);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function boot() {
      await initDatabase();

      if (supabase) {
        const { data } = await supabase.auth.getSession();
        if (isMounted) {
          setSession(data.session);
        }
      }

      await refresh();
      if (isMounted) {
        setIsReady(true);
      }
    }

    boot().catch((error) => {
      setSyncMessage(error instanceof Error ? error.message : 'Unable to start LensCal.');
      setIsReady(true);
    });

    if (!supabase) {
      return () => {
        isMounted = false;
      };
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [refresh]);

  const eyes = useMemo<Record<Eye, EyeState>>(() => {
    const next: Record<Eye, EyeState> = {
      left: emptyEye('left'),
      right: emptyEye('right'),
    };

    for (const eye of Object.keys(next) as Eye[]) {
      const lens = activeLenses.find((item) => item.eye === eye) ?? null;
      next[eye].activeLens = lens;
      next[eye].latestUncomfortableEvent = lens
        ? (events.find(
            (event) => event.lens_usage_id === lens.id && event.event_type === 'uncomfortable',
          ) ?? null)
        : null;
    }

    return next;
  }, [activeLenses, events]);

  const runAction = useCallback(
    async (action: () => Promise<void>) => {
      setIsBusy(true);
      setSyncMessage(null);
      try {
        await action();
        await refresh();
      } catch (error) {
        setSyncMessage(error instanceof Error ? error.message : 'Action failed.');
      } finally {
        setIsBusy(false);
      }
    },
    [refresh],
  );

  const replaceLens = useCallback(
    async (eye: Eye, lensType: LensType, notes?: string | null, openedAt = currentDate) => {
      await runAction(async () => {
        const current = eyes[eye].activeLens;
        if (current) {
          await cancelLensNotification(current.notification_id);
          await discardLensInDb(current, 'replaced');
        }

        const nextLens = await openLens({
          eye,
          lensType,
          openedAt,
          notes,
          userId: session?.user.id ?? null,
          monthlyReplacementDays: settings.monthlyReplacementDays,
        });
        const notificationId = await scheduleReplacementNotification(nextLens, settings);
        if (notificationId) {
          await setLensNotificationId(nextLens.id, notificationId);
        }
      });
    },
    [currentDate, eyes, runAction, session?.user.id, settings],
  );

  const advanceTestDay = useCallback(() => {
    setTestDateOffsetDays((days) => days + 1);
  }, []);

  const resetTestDate = useCallback(() => {
    setTestDateOffsetDays(0);
  }, []);

  const discardLens = useCallback(
    async (eye: Eye) => {
      await runAction(async () => {
        const current = eyes[eye].activeLens;
        if (!current) {
          return;
        }

        await cancelLensNotification(current.notification_id);
        await discardLensInDb(current, 'discarded');
      });
    },
    [eyes, runAction],
  );

  const markUncomfortable = useCallback(
    async (eye: Eye, notes?: string | null) => {
      await runAction(async () => {
        const current = eyes[eye].activeLens;
        if (!current) {
          return;
        }

        await insertEvent(current.id, 'uncomfortable', notes ?? null, session?.user.id ?? null);
      });
    },
    [eyes, runAction, session?.user.id],
  );

  const scheduleMissingNotifications = useCallback(
    async () => {
      if (!settings.notificationsEnabled) {
        return;
      }

      const lenses = await getActiveLenses();
      for (const lens of lenses) {
        if (lens.notification_id) {
          continue;
        }

        const notificationId = await scheduleReplacementNotification(lens, settings);
        if (notificationId) {
          await setLensNotificationId(lens.id, notificationId);
        }
      }
    },
    [settings],
  );

  const updateSetting = useCallback(
    async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
      await runAction(async () => {
        await updateSettingInDb(key, value);

        if (
          key === 'notificationsEnabled' ||
          key === 'reminderHour' ||
          key === 'reminderMinute'
        ) {
          const nextSettings = {
            ...settings,
            [key]: value,
          };

          for (const lens of activeLenses) {
            await cancelLensNotification(lens.notification_id);

            if (nextSettings.notificationsEnabled) {
              const notificationId = await scheduleReplacementNotification(lens, nextSettings);
              await setLensNotificationId(lens.id, notificationId);
            } else {
              await setLensNotificationId(lens.id, null);
            }
          }
        }
      });
    },
    [activeLenses, runAction, settings],
  );

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) {
      setSyncMessage('Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to enable sync.');
      return;
    }

    setIsBusy(true);
    setSyncMessage(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        throw error;
      }
      setSyncMessage('Signed in. Sync is available.');
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : 'Sign in failed.');
    } finally {
      setIsBusy(false);
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    if (!supabase) {
      setSyncMessage('Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to enable sync.');
      return;
    }

    setIsBusy(true);
    setSyncMessage(null);
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        throw error;
      }
      setSyncMessage('Account created. Check email if confirmation is enabled.');
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : 'Sign up failed.');
    } finally {
      setIsBusy(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) {
      return;
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
      setSyncMessage(error.message);
    } else {
      setSyncMessage('Signed out.');
    }
  }, []);

  const syncNow = useCallback(async () => {
    if (!supabase || !session) {
      setSyncMessage('Sign in with Supabase to sync across devices.');
      return null;
    }

    setIsBusy(true);
    setSyncMessage(null);
    try {
      const summary = await syncWithSupabase(supabase, session.user.id);
      await scheduleMissingNotifications();
      await refresh();
      setSyncMessage(
        `Synced ${summary.pushedUsages + summary.pushedEvents} local changes and pulled ${
          summary.pulledUsages + summary.pulledEvents
        } remote records.`,
      );
      return summary;
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : 'Sync failed.');
      return null;
    } finally {
      setIsBusy(false);
    }
  }, [refresh, scheduleMissingNotifications, session]);

  useEffect(() => {
    if (isReady && session) {
      syncNow();
    }
  }, [isReady, session, syncNow]);

  const value = useMemo<LensContextValue>(
    () => ({
      isReady,
      isBusy,
      settings,
      currentDate,
      testDateOffsetDays,
      eyes,
      history,
      events,
      session,
      isSupabaseConfigured,
      syncMessage,
      refresh,
      advanceTestDay,
      resetTestDate,
      replaceLens,
      discardLens,
      markUncomfortable,
      updateSetting,
      signIn,
      signUp,
      signOut,
      syncNow,
    }),
    [
      isReady,
      isBusy,
      settings,
      currentDate,
      testDateOffsetDays,
      eyes,
      history,
      events,
      session,
      syncMessage,
      refresh,
      advanceTestDay,
      resetTestDate,
      replaceLens,
      discardLens,
      markUncomfortable,
      updateSetting,
      signIn,
      signUp,
      signOut,
      syncNow,
    ],
  );

  return <LensContext.Provider value={value}>{children}</LensContext.Provider>;
}

export function useLens() {
  const context = useContext(LensContext);
  if (!context) {
    throw new Error('useLens must be used inside LensProvider.');
  }

  return context;
}
