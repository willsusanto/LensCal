'use client';

import { Eye } from 'lucide-react';

import { palette } from '@/constants/palette';
import { displayLensType, formatDateTime, formatShortDate } from '@/lib/date-utils';
import { useLens } from '@/providers/lens-provider';
import type { LensEvent, LensUsage } from '@/types/lens';

function eventLabel(event: LensEvent) {
  switch (event.event_type) {
    case 'opened': return 'Opened';
    case 'uncomfortable': return 'Marked uncomfortable';
    case 'discarded': return 'Discarded';
    case 'replaced': return 'Replaced';
  }
}

function UsageRow({ usage, events }: { usage: LensUsage; events: LensEvent[] }) {
  const usageEvents = events.filter((e) => e.lens_usage_id === usage.id);
  const isLeft = usage.eye === 'left';

  return (
    <div
      className="flex flex-col gap-3 rounded-lg border p-4"
      style={{
        borderColor: usage.status === 'active' ? palette.lineStrong : palette.line,
        backgroundColor: palette.surface,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="flex items-center justify-center rounded-full w-[42px] h-[42px] shrink-0"
            style={{ backgroundColor: isLeft ? palette.surfaceBlue : palette.faint }}
          >
            <Eye size={22} color={palette.black} />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-black" style={{ color: palette.ink }}>
              {usage.eye === 'left' ? 'Left Eye' : 'Right Eye'}
            </p>
            <p className="text-sm font-bold" style={{ color: palette.muted }}>
              {displayLensType(usage.lens_type)} lens
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end shrink-0 gap-1">
          <span
            className="rounded-full px-2.5 py-1 text-[11px] font-black uppercase"
            style={{
              backgroundColor: usage.status === 'active' ? palette.surfaceBlue : palette.faint,
              color: usage.status === 'active' ? palette.blueDeep : palette.muted,
            }}
          >
            {usage.status}
          </span>
        </div>
      </div>

      {/* Date range */}
      <div
        className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm"
        style={{ backgroundColor: palette.surfaceSoft }}
      >
        <div>
          <p className="text-[10px] font-black uppercase" style={{ color: palette.muted }}>Opened</p>
          <p className="font-bold" style={{ color: palette.ink }}>{formatShortDate(usage.opened_at)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black uppercase" style={{ color: palette.muted }}>Expires</p>
          <p className="font-bold" style={{ color: palette.ink }}>{formatShortDate(usage.expires_at)}</p>
        </div>
      </div>

      {/* Event log */}
      {usageEvents.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {usageEvents.map((event) => (
            <div key={event.id} className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold" style={{ color: palette.ink }}>{eventLabel(event)}</p>
              <p className="text-xs font-bold" style={{ color: palette.muted }}>{formatDateTime(event.event_at)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function HistoryPage() {
  const { history, events, isReady } = useLens();

  return (
    <div className="flex flex-col gap-4 px-4 pb-4">
      {/* Header */}
      <div
        className="sticky top-0 z-10 -mx-4 px-4 pt-4 pb-3"
        style={{ backgroundColor: palette.background }}
      >
        <h1 className="text-[28px] font-black" style={{ color: palette.ink }}>History</h1>
        <p className="text-sm font-bold" style={{ color: palette.muted }}>
          All your lens usage records.
        </p>
      </div>

      {!isReady ? (
        <p className="text-sm font-bold" style={{ color: palette.muted }}>Loading…</p>
      ) : history.length === 0 ? (
        <div
          className="rounded-lg border p-6 flex flex-col gap-2 items-center text-center"
          style={{ borderColor: palette.line, backgroundColor: palette.surface }}
        >
          <p className="text-lg font-black" style={{ color: palette.ink }}>No history yet</p>
          <p className="text-sm font-bold" style={{ color: palette.muted }}>
            Open a lens pack from the Today screen to get started.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {history.map((usage) => (
            <UsageRow key={usage.id} usage={usage} events={events} />
          ))}
        </div>
      )}
    </div>
  );
}

