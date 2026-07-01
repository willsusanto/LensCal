"use client";

import { useEffect } from "react";

const staleRuntimeCaches = [
  "start-url",
  "pages",
  "pages-rsc",
  "pages-rsc-prefetch",
  "next-data",
];

const recoverableErrorPatterns = [
  "failed to fetch",
  "loading chunk",
  "chunkloaderror",
  "networkerror",
  "502",
  "bad gateway",
];

const recoveryStorageKey = "lenscal:asset-error-recovery";

function shouldRecoverFromMessage(message: string) {
  const normalizedMessage = message.toLowerCase();
  return recoverableErrorPatterns.some((pattern) =>
    normalizedMessage.includes(pattern),
  );
}

function recoverOnce() {
  const lastRecovery = Number(
    window.sessionStorage.getItem(recoveryStorageKey) ?? 0,
  );
  const now = Date.now();

  if (now - lastRecovery < 10_000) return;

  window.sessionStorage.setItem(recoveryStorageKey, String(now));
  window.location.reload();
}

export function PwaCacheGuard() {
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message =
        reason instanceof Error ? reason.message : String(reason ?? "");

      if (shouldRecoverFromMessage(message)) {
        recoverOnce();
      }
    };

    const handleError = (event: ErrorEvent) => {
      if (shouldRecoverFromMessage(event.message)) {
        recoverOnce();
      }
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("error", handleError);

    if (!("serviceWorker" in navigator)) {
      return () => {
        window.removeEventListener(
          "unhandledrejection",
          handleUnhandledRejection,
        );
        window.removeEventListener("error", handleError);
      };
    }

    let shouldReloadOnControllerChange = Boolean(navigator.serviceWorker.controller);

    const clearStaleRouteCaches = async () => {
      if (!("caches" in window)) return;

      await Promise.all(
        staleRuntimeCaches.map((cacheName) => window.caches.delete(cacheName)),
      );
    };

    const handleControllerChange = () => {
      if (!shouldReloadOnControllerChange) {
        shouldReloadOnControllerChange = true;
        return;
      }

      window.location.reload();
    };

    void clearStaleRouteCaches();
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      handleControllerChange,
    );

    return () => {
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection,
      );
      window.removeEventListener("error", handleError);
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        handleControllerChange,
      );
    };
  }, []);

  return null;
}
