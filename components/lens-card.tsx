'use client';

import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';

import { AnimatedPressable } from '@/components/animated-pressable';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Card } from '@/components/ui/primitives';
import { palette } from '@/constants/palette';
import { daysRemaining, daysUsed, displayLensType, formatShortDate, lensDurationDays } from '@/lib/date-utils';
import { useLens } from '@/providers/lens-provider';
import type { Eye, EyeState } from '@/types/lens';

type LensCardProps = {
  state: EyeState;
  disabled: boolean;
  currentDate: Date;
  compact?: boolean;
};

function accentForEye(eye: Eye) {
  return eye === 'left'
    ? { strong: palette.blueDeep, soft: palette.surfaceBlue, rail: palette.blueDeep }
    : { strong: palette.black, soft: palette.surfaceSoft, rail: palette.black };
}

export function LensCard({ state, disabled, currentDate, compact = false }: LensCardProps) {
  const router = useRouter();
  const { markUncomfortable, discardLens, isBusy } = useLens();
  const lens = state.activeLens;
  const duration = lens ? lensDurationDays(lens.opened_at, lens.expires_at) : 28;
  const used = lens ? daysUsed(lens.opened_at, currentDate) : 0;
  const remaining = lens ? daysRemaining(lens.expires_at, currentDate) : 0;
  const progress = lens ? Math.min(1, used / duration) : 0;
  const accent = accentForEye(state.eye);
  const isExpired = remaining < 0;
  const replaceLabel = isExpired ? `${Math.abs(remaining)}d overdue` : `${remaining}d left`;
  const eyeLabel = state.eye === 'left' ? 'Left' : 'Right';

  return (
    <Card style={{ gap: compact ? 12 : 14, padding: compact ? 14 : 16 }}>
      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="flex items-center justify-center rounded-full shrink-0"
            style={{
              width: compact ? 48 : 52,
              height: compact ? 48 : 52,
              backgroundColor: accent.soft,
            }}
          >
            <IconSymbol name="eye.fill" color={accent.strong} size={compact ? 27 : 29} />
          </div>
          <div className="min-w-0">
            <p className="font-black truncate" style={{ color: palette.ink, fontSize: compact ? 20 : 22 }}>
              {eyeLabel} lens
            </p>
            <p className="text-sm font-bold" style={{ color: palette.muted }}>
              {lens ? `${displayLensType(lens.lens_type)} cycle` : 'No active lens'}
            </p>
          </div>
        </div>

        <span
          className="rounded-full px-2.5 py-1.5 text-xs font-black shrink-0"
          style={{
            backgroundColor: lens ? (isExpired ? palette.dangerBg : palette.surfaceBlue) : palette.surfaceSoft,
            color: lens ? (isExpired ? palette.danger : palette.blueDeep) : palette.muted,
          }}
        >
          {lens ? replaceLabel : 'READY'}
        </span>
      </div>

      {/* Body */}
      {lens ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Day counter row */}
          <div
            className="flex items-center justify-between rounded-lg p-3"
            style={{ backgroundColor: palette.surfaceSoft, gap: 10 }}
          >
            <div>
              <p className="text-[11px] font-black uppercase" style={{ color: palette.muted }}>Day</p>
              <p
                className="font-black tabular-nums leading-none"
                style={{ color: palette.ink, fontSize: compact ? 38 : 42 }}
              >
                {used}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-black uppercase" style={{ color: palette.muted }}>Replace by</p>
              <p className="text-lg font-black" style={{ color: palette.ink }}>
                {formatShortDate(lens.expires_at)}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: palette.faint }}>
            <div
              className="h-2 rounded-full"
              style={{
                width: `${progress * 100}%`,
                backgroundColor: isExpired ? palette.danger : accent.rail,
              }}
            />
          </div>
        </div>
      ) : (
        <div
          className="flex flex-col justify-center rounded-lg border p-3.5"
          style={{
            minHeight: compact ? 76 : 86,
            borderColor: palette.line,
            backgroundColor: palette.surfaceBlue,
            gap: 5,
          }}
        >
          <p className="font-black" style={{ color: palette.ink, fontSize: compact ? 19 : 21 }}>
            Start fresh
          </p>
          <p className="text-sm font-bold" style={{ color: palette.muted }}>
            Open a pack for a fresh date.
          </p>
        </div>
      )}

      {/* Uncomfortable warning */}
      {lens && state.latestUncomfortableEvent && (
        <div className="rounded-lg px-3 py-2" style={{ backgroundColor: palette.warningBg }}>
          <p className="font-extrabold" style={{ color: palette.warning, fontSize: compact ? 12 : 13 }}>
            Feels off since {formatShortDate(state.latestUncomfortableEvent.event_at)}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {/* Primary CTA */}
        <AnimatedPressable
          onClick={() => router.push(`/replace-lens?eye=${state.eye}`)}
          disabled={disabled}
          className="flex-1 min-h-[42px] flex items-center justify-center gap-2 rounded-full font-black text-sm px-3 py-2.5"
          style={{
            backgroundColor: lens ? palette.black : palette.blueDeep,
            color: palette.white,
            opacity: disabled ? 0.45 : undefined,
          }}
        >
          <RefreshCw size={compact ? 17 : 18} />
          {lens ? 'Change lens' : 'Open pack'}
        </AnimatedPressable>

        {/* Secondary actions — only when lens is active */}
        {lens && (
          <>
            <AnimatedPressable
              title="Mark uncomfortable"
              disabled={disabled || isBusy}
              onClick={() => markUncomfortable(state.eye)}
              className="h-[42px] w-[42px] flex items-center justify-center rounded-full border shrink-0"
              style={{ borderColor: palette.line, backgroundColor: palette.surface, color: palette.warning }}
            >
              <IconSymbol name="exclamationmark.triangle.fill" size={18} color={palette.warning} />
            </AnimatedPressable>
            <AnimatedPressable
              title="Discard lens"
              disabled={disabled || isBusy}
              onClick={() => discardLens(state.eye)}
              className="h-[42px] w-[42px] flex items-center justify-center rounded-full border shrink-0"
              style={{ borderColor: palette.line, backgroundColor: palette.surface, color: palette.danger }}
            >
              <IconSymbol name="trash.fill" size={18} color={palette.danger} />
            </AnimatedPressable>
          </>
        )}
      </div>
    </Card>
  );
}

