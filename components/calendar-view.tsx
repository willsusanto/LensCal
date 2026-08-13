"use client";

import { ChevronLeft, ChevronRight, Eye as EyeIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  displayLensType,
  formatDateTime,
  formatMonthYear,
  getCalendarDaysForMonth,
  toLocalDateKey,
} from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import type { Eye, LensEvent, LensEventType, LensUsage } from "@/types/lens";

interface EventItem {
  id: string;
  eye: Eye;
  eventType: LensEventType;
  eventAt: string;
  notes?: string | null;
  lensType?: string;
}

interface CalendarViewProps {
  history: LensUsage[];
  events: LensEvent[];
}

const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function eventTypePriority(type: LensEventType): number {
  switch (type) {
    case "discarded":
      return 3;
    case "uncomfortable":
      return 2;
    case "opened":
    case "replaced":
      return 1;
  }
}

function getDotColorClass(eventType: LensEventType): string {
  switch (eventType) {
    case "discarded":
      return "bg-danger shadow-xs";
    case "uncomfortable":
      return "bg-amber-500 shadow-xs";
    case "opened":
    case "replaced":
      return "bg-openedGreen shadow-xs";
  }
}

function getActionBadgeVariant(eventType: LensEventType): "secondary" | "muted" | "destructive" | "warning" {
  switch (eventType) {
    case "opened":
    case "replaced":
      return "secondary";
    case "discarded":
      return "destructive";
    case "uncomfortable":
      return "warning";
  }
}


function formatEventLabel(eventType: LensEventType): string {
  switch (eventType) {
    case "opened":
      return "Opened lens";
    case "replaced":
      return "Replaced lens";
    case "discarded":
      return "Discarded lens";
    case "uncomfortable":
      return "Marked uncomfortable";
  }
}

function formatSelectedDateTitle(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function CalendarView({ history, events }: CalendarViewProps) {
  const today = useMemo(() => new Date(), []);
  const [currentYear, setCurrentYear] = useState(() => today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => today.getMonth());
  const [selectedDateKey, setSelectedDateKey] = useState(() => toLocalDateKey(today));

  // Map history and events into a dateKey dictionary
  const eventsByDateKey = useMemo(() => {
    const usagesMap = new Map<string, LensUsage>();
    for (const usage of history) {
      usagesMap.set(usage.id, usage);
    }

    const dateMap = new Map<string, { left: EventItem[]; right: EventItem[] }>();

    function addEvent(dateKey: string, item: EventItem) {
      let entry = dateMap.get(dateKey);
      if (!entry) {
        entry = { left: [], right: [] };
        dateMap.set(dateKey, entry);
      }
      if (item.eye === "left") {
        entry.left.push(item);
      } else {
        entry.right.push(item);
      }
    }

    // Add explicit lens_events
    for (const event of events) {
      const dateKey = toLocalDateKey(event.event_at);
      const usage = usagesMap.get(event.lens_usage_id);
      const eye = usage?.eye ?? "left";

      addEvent(dateKey, {
        id: event.id,
        eye,
        eventType: event.event_type,
        eventAt: event.event_at,
        notes: event.notes,
        lensType: usage ? displayLensType(usage.lens_type) : undefined,
      });
    }

    // Add opened events from lens_usages if not already covered by an opened/replaced event
    for (const usage of history) {
      const openedKey = toLocalDateKey(usage.opened_at);
      const existing = dateMap.get(openedKey);
      const list = usage.eye === "left" ? existing?.left : existing?.right;

      const hasOpenedEvent = list?.some(
        (e) => e.eventType === "opened" || e.eventType === "replaced",
      );

      if (!hasOpenedEvent) {
        addEvent(openedKey, {
          id: `opened-${usage.id}`,
          eye: usage.eye,
          eventType: "opened",
          eventAt: usage.opened_at,
          notes: usage.notes,
          lensType: displayLensType(usage.lens_type),
        });
      }
    }

    return dateMap;
  }, [events, history]);


  // Calendar days grid matrix
  const calendarCells = useMemo(
    () => getCalendarDaysForMonth(currentYear, currentMonth),
    [currentYear, currentMonth],
  );

  function handlePrevMonth() {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  }

  function handleNextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  }

  function handleToday() {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
    setSelectedDateKey(toLocalDateKey(now));
  }

  // Selected date event agenda list
  const selectedDayEvents = useMemo(() => {
    const entry = eventsByDateKey.get(selectedDateKey);
    if (!entry) return [];
    const all = [...entry.left, ...entry.right];
    return all.sort(
      (a, b) => new Date(a.eventAt).getTime() - new Date(b.eventAt).getTime(),
    );
  }, [eventsByDateKey, selectedDateKey]);

  return (
    <div className="space-y-6">
      <Card className="p-4 sm:p-6">
        {/* Month Header & Controls */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase text-blueDeep tracking-wider">
              Calendar View
            </p>
            <h2 className="text-2xl font-black text-ink">
              {formatMonthYear(currentYear, currentMonth)}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handlePrevMonth}
              aria-label="Previous month"
            >
              <ChevronLeft size={16} />
              <span>Prev</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleToday}
              className="font-black text-blueDeep hover:bg-surfaceBlue"
            >
              Today
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleNextMonth}
              aria-label="Next month"
            >
              <span>Next</span>
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>

        {/* Legend Bar */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surfaceSoft p-3 text-xs font-bold">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[10px] font-black uppercase text-muted">
              Eye Position:
            </span>
            <div className="flex items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 py-1">
              <span className="h-2.5 w-2.5 rounded-full bg-openedGreen" />
              <span className="h-2.5 w-2.5 rounded-full border border-line opacity-30" />
              <span className="text-xs font-black text-ink">Left Eye (L)</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 py-1">
              <span className="h-2.5 w-2.5 rounded-full border border-line opacity-30" />
              <span className="h-2.5 w-2.5 rounded-full bg-openedGreen" />
              <span className="text-xs font-black text-ink">Right Eye (R)</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[10px] font-black uppercase text-muted">
              Event Action:
            </span>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-openedGreen" />
              <span>Opened</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-danger" />
              <span>Discarded</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              <span>Uncomfortable</span>
            </div>

          </div>
        </div>

        {/* Weekday Headers */}
        <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-black text-muted">
          {WEEKDAYS.map((day) => (
            <div key={day} className="py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Month Grid */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {calendarCells.map((cell) => {
            const entry = eventsByDateKey.get(cell.dateKey);
            const leftEvent = entry?.left.reduce<EventItem | null>(
              (top, item) =>
                !top ||
                eventTypePriority(item.eventType) >
                  eventTypePriority(top.eventType)
                  ? item
                  : top,
              null,
            );
            const rightEvent = entry?.right.reduce<EventItem | null>(
              (top, item) =>
                !top ||
                eventTypePriority(item.eventType) >
                  eventTypePriority(top.eventType)
                  ? item
                  : top,
              null,
            );

            const isSelected = cell.dateKey === selectedDateKey;

            return (
              <button
                key={cell.dateKey}
                type="button"
                onClick={() => setSelectedDateKey(cell.dateKey)}
                className={cn(
                  "flex h-16 sm:h-20 flex-col justify-between rounded-lg p-2 text-left transition-all outline-none",
                  cell.isCurrentMonth
                    ? "bg-surface text-ink hover:border-blueDeep"
                    : "bg-surfaceSoft/50 text-muted/40",
                  isSelected
                    ? "border-2 border-blueDeep shadow-sm"
                    : "border border-line",
                  cell.isToday && !isSelected && "bg-surfaceBlue/40 border-blueDeep/50",
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "text-xs font-black",
                      cell.isToday
                        ? "flex h-5 w-5 items-center justify-center rounded-full bg-blueDeep text-white"
                        : cell.isCurrentMonth
                          ? "text-ink"
                          : "text-muted/40",
                    )}
                  >
                    {cell.dayNumber}
                  </span>
                </div>

                {/* Fixed 2-Dot Position (Left Slot | Right Slot) */}
                <div className="flex items-center justify-center gap-2 rounded-md border border-line/60 bg-surfaceSoft/80 py-1">
                  {leftEvent ? (
                    <span
                      className={cn(
                        "h-2.5 w-2.5 rounded-full transition-transform",
                        getDotColorClass(leftEvent.eventType),
                      )}
                      title={`Left Eye: ${leftEvent.eventType}`}
                    />
                  ) : (
                    <span className="h-2.5 w-2.5 rounded-full border border-line opacity-20" />
                  )}

                  {rightEvent ? (
                    <span
                      className={cn(
                        "h-2.5 w-2.5 rounded-full transition-transform",
                        getDotColorClass(rightEvent.eventType),
                      )}
                      title={`Right Eye: ${rightEvent.eventType}`}
                    />
                  ) : (
                    <span className="h-2.5 w-2.5 rounded-full border border-line opacity-20" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Selected Day Agenda Sheet */}
      <Card className="p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div>
            <p className="text-[11px] font-black uppercase text-muted tracking-wider">
              Day Agenda
            </p>
            <h3 className="text-lg font-black text-ink">
              Events on {formatSelectedDateTitle(selectedDateKey)}
            </h3>
          </div>

          <Badge variant="secondary">
            {selectedDayEvents.length} event
            {selectedDayEvents.length === 1 ? "" : "s"}
          </Badge>
        </div>

        {selectedDayEvents.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-sm font-bold text-muted">
              No lens events recorded for this date.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {selectedDayEvents.map((item) => {
              const isLeft = item.eye === "left";

              return (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg font-black text-sm",
                        isLeft
                          ? "bg-surfaceBlue text-blueDeep"
                          : "bg-surfaceSoft text-ink",
                      )}
                    >
                      <EyeIcon size={20} />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-base font-black text-ink">
                          {isLeft ? "Left Eye" : "Right Eye"}
                        </p>
                        {item.lensType && (
                          <span className="text-xs font-bold text-muted">
                            ({item.lensType} lens)
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-muted">
                        {formatDateTime(item.eventAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    {item.notes && (
                      <span className="text-xs font-bold text-muted truncate max-w-xs">
                        &quot;{item.notes}&quot;
                      </span>
                    )}

                    <Badge variant={getActionBadgeVariant(item.eventType)}>
                      {formatEventLabel(item.eventType)}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
