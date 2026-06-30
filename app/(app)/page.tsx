'use client';

import { LensCard } from '@/components/lens-card';
import { Card } from '@/components/ui/primitives';
import { palette } from '@/constants/palette';
import { formatShortDate } from '@/lib/date-utils';
import { useLens } from '@/providers/lens-provider';

export default function TodayPage() {
  const { eyes, isReady, isBusy } = useLens();
  const currentDate = new Date();

  const activeLenses = [eyes.left.activeLens, eyes.right.activeLens].filter(Boolean);
  const nearestLens = activeLenses
    .slice()
    .sort((a, b) => new Date(a!.expires_at).getTime() - new Date(b!.expires_at).getTime())[0];

  return (
    <div className="flex flex-col gap-4 px-4 pb-4">
      {/* Sticky header */}
      <div
        className="sticky top-0 z-10 -mx-4 px-4 pt-4 pb-3 flex flex-col gap-1"
        style={{ backgroundColor: palette.background }}
      >
        <h1 className="text-[34px] font-black leading-tight" style={{ color: palette.ink }}>
          LensCal
        </h1>
        <p className="text-[15px] font-bold" style={{ color: palette.muted }}>
          Softlens care, made calmer.
        </p>
      </div>

      {/* Next replacement summary */}
      <Card tone="soft" style={{ gap: 14 }}>
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-black uppercase" style={{ color: palette.muted }}>
            Next replacement
          </p>
          <p className="text-[32px] font-black leading-tight" style={{ color: palette.ink }}>
            {nearestLens
              ? `${nearestLens.eye === 'left' ? 'Left' : 'Right'} lens`
              : 'No active lenses'}
          </p>
          <p className="text-sm font-bold" style={{ color: palette.muted }}>
            {nearestLens
              ? formatShortDate(nearestLens.expires_at)
              : 'Open a pack for either eye to start tracking.'}
          </p>
        </div>
      </Card>

      {/* Per-eye cards */}
      {!isReady ? (
        <Card style={{ gap: 8 }}>
          <p className="text-lg font-black" style={{ color: palette.ink }}>Loading lenses</p>
          <p className="text-sm font-bold" style={{ color: palette.muted }}>
            Preparing your current lens status.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-black" style={{ color: palette.ink }}>Current lenses</h2>
            <p className="text-sm font-bold" style={{ color: palette.muted }}>
              Tap a card to change or open a pack.
            </p>
          </div>
          <LensCard state={eyes.left} disabled={isBusy} currentDate={currentDate} />
          <LensCard state={eyes.right} disabled={isBusy} currentDate={currentDate} />
        </div>
      )}
    </div>
  );
}

