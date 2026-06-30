"use client";

import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { IconSymbol } from "@/components/ui/icon-symbol";
import {
  daysRemaining,
  daysUsed,
  displayLensType,
  formatShortDate,
  lensDurationDays,
} from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { useLens } from "@/providers/lens-provider";
import type { Eye, EyeState } from "@/types/lens";

type LensCardProps = {
  state: EyeState;
  disabled: boolean;
  currentDate: Date;
  compact?: boolean;
};

const progressWidths = [
  "w-0",
  "w-[5%]",
  "w-[10%]",
  "w-[15%]",
  "w-[20%]",
  "w-[25%]",
  "w-[30%]",
  "w-[35%]",
  "w-[40%]",
  "w-[45%]",
  "w-1/2",
  "w-[55%]",
  "w-[60%]",
  "w-[65%]",
  "w-[70%]",
  "w-3/4",
  "w-[80%]",
  "w-[85%]",
  "w-[90%]",
  "w-[95%]",
  "w-full",
] as const;

function eyeTone(eye: Eye) {
  return eye === "left"
    ? {
        icon: "bg-surfaceBlue text-blueDeep",
        bar: "bg-blueDeep",
        empty: "bg-surfaceBlue",
      }
    : {
        icon: "bg-surfaceSoft text-ink",
        bar: "bg-ink",
        empty: "bg-surfaceSoft",
      };
}

function remainingLabel(remaining: number) {
  if (remaining < 0) return `${Math.abs(remaining)}d overdue`;
  if (remaining === 0) return "Due today";
  return `${remaining}d left`;
}

export function LensCard({ state, disabled, currentDate, compact = false }: LensCardProps) {
  const router = useRouter();
  const { markUncomfortable, discardLens, isBusy } = useLens();
  const lens = state.activeLens;
  const tone = eyeTone(state.eye);
  const eyeLabel = state.eye === "left" ? "Left" : "Right";

  const duration = lens ? lensDurationDays(lens.opened_at, lens.expires_at) : 28;
  const used = lens ? daysUsed(lens.opened_at, currentDate) : 0;
  const remaining = lens ? daysRemaining(lens.expires_at, currentDate) : 0;
  const progress = lens ? Math.min(1, Math.max(0, used / duration)) : 0;
  const progressClass = progressWidths[Math.round(progress * 20)];
  const isExpired = remaining < 0;

  return (
    <Card className={cn("flex h-full flex-col gap-4 p-4 sm:p-5", compact && "gap-3 p-4")}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={cn(
              "flex shrink-0 items-center justify-center rounded-lg",
              compact ? "h-11 w-11" : "h-12 w-12",
              tone.icon,
            )}
          >
            <IconSymbol name="eye.fill" className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className={cn("truncate font-black leading-tight text-ink", compact ? "text-lg" : "text-xl")}>
              {eyeLabel} lens
            </p>
            <p className="text-sm font-bold text-muted">
              {lens ? `${displayLensType(lens.lens_type)} cycle` : "No active lens"}
            </p>
          </div>
        </div>

        <Badge variant={lens ? (isExpired ? "destructive" : "secondary") : "muted"}>
          {lens ? remainingLabel(remaining) : "Ready"}
        </Badge>
      </div>

      {lens ? (
        <div className="flex flex-1 flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 rounded-lg bg-surfaceSoft p-3">
            <div>
              <p className="text-[11px] font-black uppercase text-muted">Day</p>
              <p className={cn("font-black tabular-nums leading-none text-ink", compact ? "text-4xl" : "text-5xl")}>
                {used}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-black uppercase text-muted">Replace by</p>
              <p className="text-lg font-black text-ink">{formatShortDate(lens.expires_at)}</p>
            </div>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-faint">
            <div
              className={cn("h-full rounded-full transition-all", isExpired ? "bg-danger" : tone.bar, progressClass)}
            />
          </div>
        </div>
      ) : (
        <div className={cn("flex flex-1 flex-col justify-center rounded-lg border border-line p-4", tone.empty)}>
          <p className={cn("font-black text-ink", compact ? "text-lg" : "text-xl")}>Start fresh</p>
          <p className="mt-1 text-sm font-bold text-muted">Open a pack for a fresh date.</p>
        </div>
      )}

      {lens && state.latestUncomfortableEvent && (
        <div className="rounded-lg bg-warningBg px-3 py-2">
          <p className="text-sm font-extrabold text-warning">
            Feels off since {formatShortDate(state.latestUncomfortableEvent.event_at)}
          </p>
        </div>
      )}

      <div className="mt-auto flex gap-2">
        <Button
          type="button"
          onClick={() => router.push(`/replace-lens?eye=${state.eye}`)}
          disabled={disabled}
          className="flex-1"
        >
          <RefreshCw size={18} />
          {lens ? "Change lens" : "Open pack"}
        </Button>

        {lens && (
          <>
            <Button
              type="button"
              title="Mark uncomfortable"
              aria-label="Mark uncomfortable"
              variant="outline"
              size="icon"
              disabled={disabled || isBusy}
              onClick={() => markUncomfortable(state.eye)}
              className="text-warning"
            >
              <IconSymbol name="exclamationmark.triangle.fill" className="h-[18px] w-[18px]" />
            </Button>
            <Button
              type="button"
              title="Discard lens"
              aria-label="Discard lens"
              variant="outline"
              size="icon"
              disabled={disabled || isBusy}
              onClick={() => discardLens(state.eye)}
              className="text-danger"
            >
              <IconSymbol name="trash.fill" className="h-[18px] w-[18px]" />
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}
