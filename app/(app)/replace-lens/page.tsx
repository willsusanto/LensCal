'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { ArrowLeft } from 'lucide-react';

import { ActionButton } from '@/components/action-button';
import { SegmentedControl } from '@/components/segmented-control';
import { Card } from '@/components/ui/primitives';
import { palette } from '@/constants/palette';
import { displayLensType, expirationFor, formatShortDate, replacementDaysFor, startOfLocalDay } from '@/lib/date-utils';
import { useLens } from '@/providers/lens-provider';
import type { Eye, LensType } from '@/types/lens';

const lensOptions: { label: string; value: LensType }[] = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
];

function toDateInputValue(date: Date) {
  // yyyy-MM-dd in local time
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function ReplaceLensForm() {
  const router = useRouter();
  const params = useSearchParams();
  const eye: Eye = params.get('eye') === 'right' ? 'right' : 'left';

  const { settings, eyes, replaceLens, isBusy } = useLens();
  const activeLens = eyes[eye].activeLens;

  const [lensType, setLensType] = useState<LensType>(settings.defaultLensType);
  const [startDateStr, setStartDateStr] = useState(toDateInputValue(new Date()));
  const [notes, setNotes] = useState('');

  const startDate = startOfLocalDay(new Date(startDateStr + 'T00:00:00'));
  const expiresAt = expirationFor(startDate, lensType, settings.monthlyReplacementDays);
  const replacementDays = replacementDaysFor(lensType, settings.monthlyReplacementDays);
  const eyeLabel = eye === 'left' ? 'Left' : 'Right';

  async function handleSave() {
    await replaceLens(eye, lensType, notes.trim() || null, startDate);
    router.push('/');
  }

  return (
    <div className="flex flex-col gap-4 px-4 pb-6">
      {/* Header */}
      <div className="flex items-center gap-3 pt-4">
        <Link
          href="/"
          className="flex items-center justify-center w-9 h-9 rounded-full border"
          style={{ borderColor: palette.line, backgroundColor: palette.surface, color: palette.ink }}
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-[28px] font-black leading-tight" style={{ color: palette.ink }}>
            {activeLens ? 'Change' : 'Open'} {eyeLabel}
          </h1>
          <p className="text-sm font-bold" style={{ color: palette.muted }}>
            Set the cycle for this lens.
          </p>
        </div>
      </div>

      {/* Lens type */}
      <Card style={{ gap: 12 }}>
        <p className="text-xs font-black uppercase" style={{ color: palette.muted }}>Lens type</p>
        <SegmentedControl options={lensOptions} value={lensType} onChange={setLensType} disabled={isBusy} />
      </Card>

      {/* Start date */}
      <Card style={{ gap: 12 }}>
        <p className="text-xs font-black uppercase" style={{ color: palette.muted }}>Opened on</p>
        <input
          type="date"
          value={startDateStr}
          max={toDateInputValue(new Date())}
          onChange={(e) => setStartDateStr(e.target.value)}
          disabled={isBusy}
          className="w-full rounded-lg border px-3 py-2.5 text-sm font-bold outline-none"
          style={{ borderColor: palette.line, backgroundColor: palette.surface, color: palette.ink }}
        />
      </Card>

      {/* Expiry preview */}
      <Card tone="soft" style={{ gap: 6 }}>
        <p className="text-xs font-black uppercase" style={{ color: palette.muted }}>
          Expires after {replacementDays} day{replacementDays !== 1 ? 's' : ''} ({displayLensType(lensType)})
        </p>
        <p className="text-xl font-black" style={{ color: palette.ink }}>
          {formatShortDate(expiresAt)}
        </p>
      </Card>

      {/* Notes */}
      <Card style={{ gap: 12 }}>
        <p className="text-xs font-black uppercase" style={{ color: palette.muted }}>Notes (optional)</p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={isBusy}
          rows={3}
          placeholder="Any notes about this lens…"
          className="w-full rounded-lg border px-3 py-2.5 text-sm font-bold outline-none resize-none"
          style={{ borderColor: palette.line, backgroundColor: palette.surface, color: palette.ink }}
        />
      </Card>

      {/* Action */}
      <div className="flex gap-2">
        <ActionButton label="Cancel" tone="secondary" onPress={() => router.back()} disabled={isBusy} />
        <ActionButton label={isBusy ? 'Saving…' : 'Save'} tone="primary" onPress={handleSave} disabled={isBusy} />
      </div>
    </div>
  );
}

export default function ReplaceLensPage() {
  return (
    <Suspense>
      <ReplaceLensForm />
    </Suspense>
  );
}

