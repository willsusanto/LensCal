"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays } from "lucide-react";

import { LensCard } from "@/components/lens-card";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { daysRemaining, formatShortDate } from "@/lib/date-utils";
import { useLens } from "@/providers/lens-provider";

export default function TodayPage() {
  const { eyes, isReady, isBusy } = useLens();
  const currentDate = new Date();

  const activeLenses = [eyes.left.activeLens, eyes.right.activeLens].filter(Boolean);
  const nearestLens = activeLenses
    .slice()
    .sort((a, b) => new Date(a!.expires_at).getTime() - new Date(b!.expires_at).getTime())[0];

  const overdueCount = activeLenses.filter((lens) => daysRemaining(lens!.expires_at, currentDate) < 0).length;
  const activeCount = activeLenses.length;
  const nearestRemaining = nearestLens ? daysRemaining(nearestLens.expires_at, currentDate) : null;
  const nearestEye = nearestLens?.eye === "left" ? "Left" : "Right";
  const summaryActionEye = !eyes.left.activeLens ? "left" : !eyes.right.activeLens ? "right" : nearestLens?.eye ?? "left";
  const summaryActionLabel = activeCount < 2 ? "Open lens" : "Replace next";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Today"
        title="Lens dashboard"
        description="Track each eye at a glance and keep replacements on schedule."
        action={
          <div className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-sm font-black text-muted shadow-sm">
            <CalendarDays size={17} />
            {formatShortDate(currentDate)}
          </div>
        }
      />

      {!isReady ? (
        <Card className="p-6">
          <p className="text-lg font-black text-ink">Loading lenses</p>
          <p className="mt-1 text-sm font-bold text-muted">Preparing your current lens status.</p>
        </Card>
      ) : (
        <>
          <section className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.6fr)]">
            <Card className="overflow-hidden">
              <CardHeader className="border-b border-line bg-surfaceBlue">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase text-blueDeep">Next replacement</p>
                    <CardTitle className="mt-2 text-3xl sm:text-4xl">
                      {nearestLens ? `${nearestEye} lens` : "No active lenses"}
                    </CardTitle>
                  </div>
                  <Badge variant={overdueCount > 0 ? "destructive" : nearestLens ? "secondary" : "muted"}>
                    {overdueCount > 0 ? "Overdue" : nearestRemaining === 0 ? "Due today" : "On track"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-muted">
                    {nearestLens
                      ? `Replace by ${formatShortDate(nearestLens.expires_at)}.`
                      : "Open a pack for either eye to start tracking."}
                  </p>
                  {nearestRemaining !== null && (
                    <p className="mt-2 text-5xl font-black leading-none text-ink">
                      {nearestRemaining < 0 ? Math.abs(nearestRemaining) : nearestRemaining}
                      <span className="ml-2 text-base font-black text-muted">
                        {nearestRemaining < 0 ? "days overdue" : nearestRemaining === 1 ? "day left" : "days left"}
                      </span>
                    </p>
                  )}
                </div>
                <Button asChild variant={nearestLens ? "secondary" : "default"} className="sm:w-auto">
                  <Link href={`/replace-lens?eye=${summaryActionEye}`}>
                    {summaryActionLabel}
                    <ArrowRight size={17} />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <Card className="p-5">
                <p className="text-sm font-black text-muted">Active lenses</p>
                <p className="mt-3 text-4xl font-black text-ink">{activeCount}/2</p>
                <p className="mt-1 text-sm font-bold text-muted">Left and right tracked separately.</p>
              </Card>
              <Card className="p-5">
                <p className="text-sm font-black text-muted">Attention needed</p>
                <p className="mt-3 text-4xl font-black text-ink">{overdueCount}</p>
                <p className="mt-1 text-sm font-bold text-muted">Lenses past their replacement date.</p>
              </Card>
            </div>
          </section>

          <section className="space-y-3">
            <div>
              <h2 className="text-xl font-black text-ink">Current lenses</h2>
              <p className="mt-1 text-sm font-bold text-muted">Change, discard, or flag discomfort from each card.</p>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <LensCard state={eyes.left} disabled={isBusy} currentDate={currentDate} />
              <LensCard state={eyes.right} disabled={isBusy} currentDate={currentDate} />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
