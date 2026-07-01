"use client";

import { Check, Eye, Pencil, X } from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";

import { PageHeader } from "@/components/page-header";
import { SegmentedControl } from "@/components/segmented-control";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LENS_TYPE_OPTIONS } from "@/constants/lens";
import { displayLensType, formatDateTime, startOfLocalDay } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { useLens } from "@/providers/lens-provider";
import type { Eye as EyeType, LensEvent, LensType, LensUsage } from "@/types/lens";

type EyeFilter = "all" | EyeType;

const eyeFilterOptions: { label: string; value: EyeFilter }[] = [
  { label: "All", value: "all" },
  { label: "Left", value: "left" },
  { label: "Right", value: "right" },
];

function terminalEventFor(events: LensEvent[]) {
  return events.reduce<LensEvent | null>((terminal, event) => {
    if (event.event_type !== "discarded" && event.event_type !== "replaced") return terminal;
    if (!terminal) return event;
    return new Date(event.event_at).getTime() > new Date(terminal.event_at).getTime() ? event : terminal;
  }, null);
}

function usedDaysBetween(openedAt: string, endedAt: string) {
  const opened = startOfLocalDay(new Date(openedAt));
  const ended = startOfLocalDay(new Date(endedAt));
  const diff = ended.getTime() - opened.getTime();
  return Math.max(1, Math.floor(diff / 86_400_000) + 1);
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatAverageDays(value: number) {
  if (value === 0) return "0";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatFullDate(value: string | Date) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(typeof value === "string" ? new Date(value) : value);
}

function toDateInputValue(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateInputToLocalDay(value: string) {
  return startOfLocalDay(new Date(`${value}T00:00:00`));
}

function eventLabel(event: LensEvent) {
  switch (event.event_type) {
    case "opened":
      return "Opened";
    case "uncomfortable":
      return "Marked uncomfortable";
    case "discarded":
      return "Discarded";
    case "replaced":
      return "Replaced";
  }
}

function UsageRow({
  usage,
  events,
  isBusy,
  onUpdateDates,
}: {
  usage: LensUsage;
  events: LensEvent[];
  isBusy: boolean;
  onUpdateDates: (
    usageId: string,
    openedAt: Date,
    terminalEvent?: { id: string; eventAt: Date } | null,
  ) => Promise<void>;
}) {
  const isLeft = usage.eye === "left";
  const terminalEvent = terminalEventFor(events);
  const endDate = terminalEvent?.event_at ?? (usage.status === "discarded" ? usage.updated_at : new Date().toISOString());
  const usedDays = usedDaysBetween(usage.opened_at, endDate);
  const [isEditing, setIsEditing] = useState(false);
  const [openedDate, setOpenedDate] = useState(toDateInputValue(usage.opened_at));
  const [endedDate, setEndedDate] = useState(toDateInputValue(endDate));
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setOpenedDate(toDateInputValue(usage.opened_at));
    setEndedDate(toDateInputValue(endDate));
    setError(null);
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setError(null);

    try {
      const nextOpenedAt = dateInputToLocalDay(openedDate);
      const nextEndedAt = terminalEvent ? dateInputToLocalDay(endedDate) : null;

      if (nextEndedAt && nextEndedAt.getTime() < nextOpenedAt.getTime()) {
        throw new RangeError("End date cannot be before opened date.");
      }

      await onUpdateDates(
        usage.id,
        nextOpenedAt,
        terminalEvent && nextEndedAt ? { id: terminalEvent.id, eventAt: nextEndedAt } : null,
      );
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update these dates.");
    }
  }

  function handleCancel() {
    resetForm();
    setIsEditing(false);
  }

  return (
    <>
      <Card className="flex h-full flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg",
                isLeft ? "bg-surfaceBlue text-blueDeep" : "bg-surfaceSoft text-ink",
              )}
            >
              <Eye size={22} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-black text-ink">{isLeft ? "Left Eye" : "Right Eye"}</p>
              <p className="text-sm font-bold text-muted">{displayLensType(usage.lens_type)} lens</p>
            </div>
          </div>

          <Badge variant={usage.status === "active" ? "secondary" : "muted"}>{usage.status}</Badge>
        </div>

        <div className="rounded-lg border border-line bg-surface px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold text-ink">
                {formatFullDate(usage.opened_at)} - {formatFullDate(endDate)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <div className="flex items-baseline gap-1 rounded-full bg-surfaceSoft px-3 py-1.5 sm:justify-end">
                <span className="text-xs font-black uppercase text-muted">Used</span>
                <span className="text-sm font-black text-ink">
                  {usedDays} day{usedDays === 1 ? "" : "s"}
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Edit dates"
                onClick={() => {
                  resetForm();
                  setIsEditing(true);
                }}
                disabled={isBusy}
                title="Edit dates"
              >
                <Pencil size={16} />
              </Button>
            </div>
          </div>
        </div>

        {usage.notes && (
          <div className="rounded-lg border border-line bg-surface px-3 py-2">
            <p className="text-sm font-bold text-muted">{usage.notes}</p>
          </div>
        )}

        <div className="mt-auto space-y-2">
          {events.length > 0 ? (
            events.map((event) => (
              <div key={event.id} className="flex items-center justify-between gap-3 border-t border-line pt-2">
                <p className="text-sm font-black text-ink">{eventLabel(event)}</p>
                <p className="shrink-0 text-xs font-bold text-muted">{formatDateTime(event.event_at)}</p>
              </div>
            ))
          ) : (
            <p className="border-t border-line pt-2 text-sm font-bold text-muted">No events recorded.</p>
          )}
        </div>
      </Card>

      {isEditing && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/45 px-4 py-6 sm:items-center"
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`edit-dates-title-${usage.id}`}
            className="w-full max-w-lg rounded-lg border border-line bg-white shadow-action"
          >
            <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
              <div>
                <p id={`edit-dates-title-${usage.id}`} className="text-lg font-black text-ink">
                  Edit dates
                </p>
                <p className="mt-1 text-sm font-bold text-muted">
                  {isLeft ? "Left" : "Right"} {usage.lens_type} lens
                </p>
              </div>
              <Button type="button" variant="ghost" size="icon" aria-label="Close" onClick={handleCancel} disabled={isBusy}>
                <X size={18} />
              </Button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 px-5 py-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor={`opened-${usage.id}`}>Opened on</Label>
                  <Input
                    id={`opened-${usage.id}`}
                    type="date"
                    value={openedDate}
                    onChange={(event) => setOpenedDate(event.target.value)}
                    disabled={isBusy}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`ended-${usage.id}`}>Ended on</Label>
                  <Input
                    id={`ended-${usage.id}`}
                    type="date"
                    value={endedDate}
                    min={openedDate}
                    onChange={(event) => setEndedDate(event.target.value)}
                    disabled={isBusy || !terminalEvent}
                  />
                </div>
              </div>

              {!terminalEvent && (
                <p className="text-xs font-bold text-muted">End date is available after a lens is replaced or discarded.</p>
              )}
              {error && <p className="text-sm font-bold text-danger">{error}</p>}

              <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                <Button type="button" variant="secondary" onClick={handleCancel} disabled={isBusy}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isBusy}>
                  <Check size={17} />
                  {isBusy ? "Saving..." : "Save dates"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function UsageStatsCard({
  usages,
  eventsByUsageId,
}: {
  usages: LensUsage[];
  eventsByUsageId: Map<string, LensEvent[]>;
}) {
  const [lensType, setLensType] = useState<LensType>("monthly");

  const stats = useMemo(() => {
    const durations = usages
      .filter((usage) => usage.lens_type === lensType)
      .map((usage) => {
        const terminalEvent = terminalEventFor(eventsByUsageId.get(usage.id) ?? []);
        if (!terminalEvent) return null;
        return usedDaysBetween(usage.opened_at, terminalEvent.event_at);
      })
      .filter((duration): duration is number => duration !== null);

    return {
      averageDays: average(durations),
      completedCount: durations.length,
      shortestDays: durations.length ? Math.min(...durations) : 0,
      longestDays: durations.length ? Math.max(...durations) : 0,
      totalCount: usages.filter((usage) => usage.lens_type === lensType).length,
    };
  }, [eventsByUsageId, lensType, usages]);

  return (
    <Card className="p-5">
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.8fr)] md:items-center">
        <div className="space-y-4">
          <div className="max-w-xs space-y-2">
            <p className="text-[11px] font-black uppercase text-muted">Lens type</p>
            <select
              value={lensType}
              onChange={(event) => setLensType(event.target.value as LensType)}
              className="block h-11 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm font-bold text-ink outline-none transition-colors focus:border-blueDeep focus:ring-2 focus:ring-blueDeep/20"
            >
              {LENS_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="text-[11px] font-black uppercase text-muted">Average completed use</p>
            <p className="mt-1 text-5xl font-black leading-none text-ink">
              {formatAverageDays(stats.averageDays)}
              <span className="ml-2 text-base font-black text-muted">days</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-lg bg-surfaceSoft p-4">
          <div>
            <p className="text-[11px] font-black uppercase text-muted">Completed</p>
            <p className="mt-1 text-lg font-black text-ink">{stats.completedCount}</p>
          </div>
          <div>
            <p className="text-[11px] font-black uppercase text-muted">Total records</p>
            <p className="mt-1 text-lg font-black text-ink">{stats.totalCount}</p>
          </div>
          <div>
            <p className="text-[11px] font-black uppercase text-muted">Shortest</p>
            <p className="mt-1 text-lg font-black text-ink">{stats.shortestDays || "-"}</p>
          </div>
          <div>
            <p className="text-[11px] font-black uppercase text-muted">Longest</p>
            <p className="mt-1 text-lg font-black text-ink">{stats.longestDays || "-"}</p>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function HistoryPage() {
  const { history, events, isReady, isBusy, updateUsageDates } = useLens();
  const [eyeFilter, setEyeFilter] = useState<EyeFilter>("all");

  const eventsByUsageId = useMemo(() => {
    const next = new Map<string, LensEvent[]>();

    for (const event of events) {
      const usageEvents = next.get(event.lens_usage_id);
      if (usageEvents) {
        usageEvents.push(event);
      } else {
        next.set(event.lens_usage_id, [event]);
      }
    }

    return next;
  }, [events]);

  const filteredHistory = useMemo(
    () => history.filter((usage) => eyeFilter === "all" || usage.eye === eyeFilter),
    [eyeFilter, history],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="History"
        title="Usage records"
        description="Review opened, replaced, discarded, and discomfort events across both eyes."
      />

      {!isReady ? (
        <Card className="p-6">
          <p className="text-sm font-bold text-muted">Loading history...</p>
        </Card>
      ) : history.length === 0 ? (
        <Card className="flex min-h-56 flex-col items-center justify-center p-8 text-center">
          <p className="text-xl font-black text-ink">No history yet</p>
          <p className="mt-2 max-w-sm text-sm font-bold text-muted">
            Open a lens pack from the Today screen to start building your replacement timeline.
          </p>
        </Card>
      ) : (
        <>
          <div className="max-w-md">
            <SegmentedControl options={eyeFilterOptions} value={eyeFilter} onChange={setEyeFilter} />
          </div>

          <UsageStatsCard usages={filteredHistory} eventsByUsageId={eventsByUsageId} />

          {filteredHistory.length === 0 ? (
            <Card className="p-6">
              <p className="text-sm font-bold text-muted">No records match this filter.</p>
            </Card>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {filteredHistory.map((usage) => (
                <UsageRow
                  key={usage.id}
                  usage={usage}
                  events={eventsByUsageId.get(usage.id) ?? []}
                  isBusy={isBusy}
                  onUpdateDates={updateUsageDates}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
