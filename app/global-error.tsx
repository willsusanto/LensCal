"use client";

import { useEffect } from "react";

const globalRetryStorageKey = "lenscal:global-error-retry";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    const lastRetry = Number(window.sessionStorage.getItem(globalRetryStorageKey) ?? 0);
    const now = Date.now();
    if (now - lastRetry < 10_000) return;

    window.sessionStorage.setItem(globalRetryStorageKey, String(now));
    const id = window.setTimeout(() => window.location.reload(), 1200);

    return () => window.clearTimeout(id);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main
          style={{
            minHeight: "100dvh",
            display: "grid",
            placeItems: "center",
            padding: "24px",
            fontFamily: "system-ui, sans-serif",
            background: "#F6FAFE",
            color: "#101216",
            textAlign: "center",
          }}
        >
          <div style={{ maxWidth: 420 }}>
            <p style={{ margin: 0, fontWeight: 900, color: "#168FD3" }}>
              Reconnecting
            </p>
            <h1 style={{ margin: "12px 0", fontSize: 32, lineHeight: 1.05 }}>
              Refreshing LensCal
            </h1>
            <p style={{ margin: "0 0 24px", color: "#65717F", fontWeight: 700 }}>
              A deployment may have restarted the app while this screen was open.
            </p>
            <button
              type="button"
              onClick={reset}
              style={{
                minHeight: 44,
                border: 0,
                borderRadius: 8,
                padding: "0 18px",
                background: "#101216",
                color: "white",
                fontWeight: 900,
              }}
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
