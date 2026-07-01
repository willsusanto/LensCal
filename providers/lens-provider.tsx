'use client';

import type { User } from '@supabase/supabase-js';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';

import { DEFAULT_SETTINGS } from '@/constants/lens';
import {
  discardActiveLens,
  getActiveLensForEye,
  getActiveLenses,
  getEvents,
  getLensHistory,
  getSettings,
  insertEvent,
  openLens,
  updateLensUsageDates,
  updateSetting as updateSettingInDb,
  validateOpenLensInput,
} from '@/lib/data';
import { cancelLensNotification, scheduleReplacementNotification } from '@/lib/notifications';
import { createClient } from '@/lib/supabase/client';
import type { AppSettings, Eye, EyeState, LensEvent, LensType, LensUsage } from '@/types/lens';

type LensContextValue = {
  isReady: boolean;
  isBusy: boolean;
  settings: AppSettings;
  eyes: Record<Eye, EyeState>;
  history: LensUsage[];
  events: LensEvent[];
  refresh: () => Promise<void>;
  replaceLens: (eye: Eye, lensType: LensType, notes?: string | null, openedAt?: Date) => Promise<void>;
  discardLens: (eye: Eye) => Promise<void>;
  markUncomfortable: (eye: Eye, notes?: string | null) => Promise<void>;
  updateUsageDates: (
    usageId: string,
    openedAt: Date,
    terminalEvent?: { id: string; eventAt: Date } | null,
  ) => Promise<void>;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>;
  signOut: () => Promise<void>;
};

const emptyEye = (eye: Eye): EyeState => ({
  eye,
  activeLens: null,
  latestUncomfortableEvent: null,
});

const LensContext = createContext<LensContextValue | null>(null);

export function LensProvider({ children }: PropsWithChildren) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [activeLenses, setActiveLenses] = useState<LensUsage[]>([]);
  const [history, setHistory] = useState<LensUsage[]>([]);
  const [events, setEvents] = useState<LensEvent[]>([]);

  // Sync auth state with Supabase session
  useEffect(() => {
    let isMounted = true;

    const applyUser = (nextUser: User | null) => {
      if (!isMounted) return;

      setUser(nextUser);
      setIsReady(false);

      if (!nextUser) {
        setSettings(DEFAULT_SETTINGS);
        setActiveLenses([]);
        setHistory([]);
        setEvents([]);
      }
    };

    supabase.auth.getUser().then(({ data: { user } }) => {
      applyUser(user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      applyUser(session?.user ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const refresh = useCallback(async () => {
    if (!user) return;

    const [nextSettings, nextActiveLenses, nextHistory, nextEvents] = await Promise.all([
      getSettings(supabase, user.id),
      getActiveLenses(supabase, user.id),
      getLensHistory(supabase, user.id),
      getEvents(supabase, user.id),
    ]);

    setSettings(nextSettings);
    setActiveLenses(nextActiveLenses);
    setHistory(nextHistory);
    setEvents(nextEvents);
  }, [supabase, user]);

  // Load data whenever the authenticated user changes
  useEffect(() => {
    if (!user) return;

    let isMounted = true;

    async function loadUserData() {
      await refresh();
      if (isMounted) setIsReady(true);
    }

    void loadUserData();

    return () => {
      isMounted = false;
    };
  }, [user, refresh]);

  const eyes = useMemo<Record<Eye, EyeState>>(() => {
    const next: Record<Eye, EyeState> = {
      left: emptyEye('left'),
      right: emptyEye('right'),
    };

    for (const eye of Object.keys(next) as Eye[]) {
      const lens = activeLenses.find((l) => l.eye === eye) ?? null;
      next[eye].activeLens = lens;
      next[eye].latestUncomfortableEvent = lens
        ? (events.find(
            (e) => e.lens_usage_id === lens.id && e.event_type === 'uncomfortable',
          ) ?? null)
        : null;
    }

    return next;
  }, [activeLenses, events]);

  const runAction = useCallback(
    async (action: () => Promise<void>) => {
      setIsBusy(true);
      try {
        await action();
        await refresh();
      } finally {
        setIsBusy(false);
      }
    },
    [refresh],
  );

  const replaceLens = useCallback(
    async (eye: Eye, lensType: LensType, notes: string | null = null, openedAt: Date = new Date()) => {
      if (!user) return;
      await runAction(async () => {
        validateOpenLensInput({
          lensType,
          openedAt,
          notes,
          monthlyReplacementDays: settings.monthlyReplacementDays,
        });

        const current = await getActiveLensForEye(supabase, user.id, eye);
        if (current) {
          const didDiscard = await discardActiveLens(supabase, user.id, current.id);
          if (!didDiscard) {
            throw new Error('This lens changed before it could be replaced. Please try again.');
          }
          await cancelLensNotification(current.id);
        }

        const newLens = await openLens(supabase, {
          userId: user.id,
          eye,
          lensType,
          openedAt,
          notes,
          monthlyReplacementDays: settings.monthlyReplacementDays,
        });

        if (current) {
          await insertEvent(supabase, {
            userId: user.id,
            lensUsageId: current.id,
            eventType: 'replaced',
          });
        }

        await insertEvent(supabase, {
          userId: user.id,
          lensUsageId: newLens.id,
          eventType: 'opened',
          eventAt: openedAt,
          notes,
        });

        await scheduleReplacementNotification(newLens, settings);
      });
    },
    [runAction, settings, supabase, user],
  );

  const discardLens = useCallback(
    async (eye: Eye) => {
      if (!user) return;
      await runAction(async () => {
        const current = await getActiveLensForEye(supabase, user.id, eye);
        if (!current) return;

        const didDiscard = await discardActiveLens(supabase, user.id, current.id);
        if (!didDiscard) return;

        await cancelLensNotification(current.id);
        await insertEvent(supabase, {
          userId: user.id,
          lensUsageId: current.id,
          eventType: 'discarded',
        });
      });
    },
    [runAction, supabase, user],
  );

  const markUncomfortable = useCallback(
    async (eye: Eye, notes: string | null = null) => {
      if (!user) return;
      await runAction(async () => {
        const current = await getActiveLensForEye(supabase, user.id, eye);
        if (!current) return;

        await insertEvent(supabase, {
          userId: user.id,
          lensUsageId: current.id,
          eventType: 'uncomfortable',
          notes,
        });
      });
    },
    [runAction, supabase, user],
  );

  const updateUsageDates = useCallback(
    async (usageId: string, openedAt: Date, terminalEvent: { id: string; eventAt: Date } | null = null) => {
      if (!user) return;
      await runAction(async () => {
        const updatedUsage = await updateLensUsageDates(supabase, {
          userId: user.id,
          lensUsageId: usageId,
          openedAt,
          terminalEventId: terminalEvent?.id,
          terminalEventAt: terminalEvent?.eventAt,
          monthlyReplacementDays: settings.monthlyReplacementDays,
        });

        if (updatedUsage.status === 'active') {
          await cancelLensNotification(updatedUsage.id);
          await scheduleReplacementNotification(updatedUsage, settings);
        }
      });
    },
    [runAction, settings, supabase, user],
  );

  const updateSetting = useCallback(
    async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
      if (!user) return;
      await runAction(async () => {
        await updateSettingInDb(supabase, user.id, key, value);
      });
    },
    [runAction, supabase, user],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }, [router, supabase]);

  const value = useMemo<LensContextValue>(
    () => ({
      isReady,
      isBusy,
      settings,
      eyes,
      history,
      events,
      refresh,
      replaceLens,
      discardLens,
      markUncomfortable,
      updateUsageDates,
      updateSetting,
      signOut,
    }),
    [
      isReady,
      isBusy,
      settings,
      eyes,
      history,
      events,
      refresh,
      replaceLens,
      discardLens,
      markUncomfortable,
      updateUsageDates,
      updateSetting,
      signOut,
    ],
  );

  useEffect(() => {
    if (!settings.notificationsEnabled) return;

    const scheduledLensIds = activeLenses.map((lens) => lens.id);

    for (const lens of activeLenses) {
      void scheduleReplacementNotification(lens, settings);
    }

    return () => {
      for (const lensId of scheduledLensIds) {
        void cancelLensNotification(lensId);
      }
    };
  }, [activeLenses, settings]);

  return <LensContext.Provider value={value}>{children}</LensContext.Provider>;
}

export function useLens() {
  const context = useContext(LensContext);
  if (!context) {
    throw new Error('useLens must be used within a LensProvider');
  }
  return context;
}
