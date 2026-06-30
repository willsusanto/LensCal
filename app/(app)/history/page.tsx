"use client";

import { Eye } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { displayLensType, formatDateTime, formatShortDate } from "@/lib/date-utils";
import type { LensEvent, LensUsage } from "@/types/lens";
import { useLens } from "@/providers/lens-provider";
import { cn } from "@/lib/utils";

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

function UsageRow({ usage, events }: { usage: LensUsage; events: LensEvent[] }) {
  const usageEvents = events.filter((event) => event.lens_usage_id === usage.id);
  const isLeft = usage.eye === "left";

  return (
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

      <div className="grid grid-cols-2 gap-3 rounded-lg bg-surfaceSoft p-3">
        <div>
          <p className="text-[11px] font-black uppercase text-muted">Opened</p>
          <p className="mt-1 text-sm font-black text-ink">{formatShortDate(usage.opened_at)}</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-black uppercase text-muted">Expires</p>
          <p className="mt-1 text-sm font-black text-ink">{formatShortDate(usage.expires_at)}</p>
        </div>
      </div>

      {usage.notes && (
        <div className="rounded-lg border border-line bg-surface px-3 py-2">
          <p className="text-sm font-bold text-muted">{usage.notes}</p>
        </div>
      )}

      <div className="mt-auto space-y-2">
        {usageEvents.length > 0 ? (
          usageEvents.map((event) => (
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
  );
}

export default function HistoryPage() {
  const { history, events, isReady } = useLens();

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
        <div className="grid gap-4 xl:grid-cols-2">
          {history.map((usage) => (
            <UsageRow key={usage.id} usage={usage} events={events} />
          ))}
        </div>
      )}
    </div>
  );
}
