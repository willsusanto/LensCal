"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { FormEvent } from "react";
import { Suspense, useState } from "react";
import { ArrowLeft, CalendarDays } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { SegmentedControl } from "@/components/segmented-control";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  displayLensType,
  expirationFor,
  formatShortDate,
  replacementDaysFor,
  startOfLocalDay,
} from "@/lib/date-utils";
import { useLens } from "@/providers/lens-provider";
import type { Eye, LensType } from "@/types/lens";

const lensOptions: { label: string; value: LensType }[] = [
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
];

function toDateInputValue(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function ReplaceLensForm() {
  const router = useRouter();
  const params = useSearchParams();
  const eye: Eye = params.get("eye") === "right" ? "right" : "left";

  const { settings, eyes, replaceLens, isBusy } = useLens();
  const activeLens = eyes[eye].activeLens;

  const [lensType, setLensType] = useState<LensType>(settings.defaultLensType);
  const [startDateStr, setStartDateStr] = useState(toDateInputValue(new Date()));
  const [notes, setNotes] = useState("");

  const startDate = startOfLocalDay(new Date(`${startDateStr}T00:00:00`));
  const expiresAt = expirationFor(startDate, lensType, settings.monthlyReplacementDays);
  const replacementDays = replacementDaysFor(lensType, settings.monthlyReplacementDays);
  const eyeLabel = eye === "left" ? "Left" : "Right";

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    await replaceLens(eye, lensType, notes.trim() || null, startDate);
    router.push("/");
  }

  return (
    <form onSubmit={handleSave} className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        eyebrow={activeLens ? "Change lens" : "Open lens"}
        title={`${eyeLabel} eye`}
        description="Set the lens type, opening date, and any notes for this replacement."
        action={
          <Button asChild variant="secondary">
            <Link href="/">
              <ArrowLeft size={17} />
              Today
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Lens details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Lens type</Label>
              <SegmentedControl options={lensOptions} value={lensType} onChange={setLensType} disabled={isBusy} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="opened-on">Opened on</Label>
              <Input
                id="opened-on"
                type="date"
                value={startDateStr}
                max={toDateInputValue(new Date())}
                onChange={(e) => setStartDateStr(e.target.value)}
                disabled={isBusy}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lens-notes">Notes</Label>
              <Textarea
                id="lens-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isBusy}
                rows={4}
                placeholder="Any notes about this lens..."
              />
            </div>
          </CardContent>
        </Card>

        <Card className="h-fit overflow-hidden">
          <CardHeader className="bg-surfaceBlue">
            <div className="flex items-center gap-2 text-blueDeep">
              <CalendarDays size={19} />
              <p className="text-xs font-black uppercase">Expiry preview</p>
            </div>
            <CardTitle className="text-3xl">{formatShortDate(expiresAt)}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-5">
            <div className="rounded-lg bg-surfaceSoft p-4">
              <p className="text-sm font-black text-ink">
                {replacementDays} day{replacementDays !== 1 ? "s" : ""}
              </p>
              <p className="mt-1 text-sm font-bold text-muted">{displayLensType(lensType)} replacement cycle</p>
            </div>

            {activeLens && (
              <div className="rounded-lg border border-line bg-surface px-4 py-3">
                <p className="text-sm font-bold text-muted">
                  Saving will discard the current {eyeLabel.toLowerCase()} lens and open this one.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={() => router.back()} disabled={isBusy}>
          Cancel
        </Button>
        <Button type="submit" disabled={isBusy}>
          {isBusy ? "Saving..." : "Save lens"}
        </Button>
      </div>
    </form>
  );
}

export default function ReplaceLensPage() {
  return (
    <Suspense>
      <ReplaceLensForm />
    </Suspense>
  );
}
