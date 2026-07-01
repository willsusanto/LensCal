"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

const retryStorageKey = "lenscal:route-error-retry";

function shouldAutoRetry(error: Error) {
  const message = `${error.name} ${error.message}`.toLowerCase();

  return (
    message.includes("failed to fetch") ||
    message.includes("loading chunk") ||
    message.includes("chunkloaderror") ||
    message.includes("networkerror") ||
    message.includes("502") ||
    message.includes("bad gateway")
  );
}

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (!shouldAutoRetry(error)) return;

    const lastRetry = Number(window.sessionStorage.getItem(retryStorageKey) ?? 0);
    const now = Date.now();
    if (now - lastRetry < 10_000) return;

    window.sessionStorage.setItem(retryStorageKey, String(now));

    const id = window.setTimeout(() => {
      window.location.reload();
    }, 1200);

    return () => window.clearTimeout(id);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[70dvh] max-w-md flex-col justify-center px-4 text-center">
      <p className="text-sm font-black uppercase text-blueDeep">Reconnecting</p>
      <h1 className="mt-3 text-3xl font-black text-ink">LensCal needs a refresh</h1>
      <p className="mt-3 text-sm font-bold text-muted">
        A deployment may have restarted the app while this screen was open.
      </p>
      <div className="mt-6 flex justify-center gap-2">
        <Button type="button" onClick={reset} variant="secondary">
          Try again
        </Button>
        <Button type="button" onClick={() => window.location.reload()}>
          Refresh
        </Button>
      </div>
    </div>
  );
}
