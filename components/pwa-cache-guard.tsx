"use client";

import { useEffect } from "react";

const staleRuntimeCaches = [
  "start-url",
  "pages",
  "pages-rsc",
  "pages-rsc-prefetch",
  "next-data",
];

export function PwaCacheGuard() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

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
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        handleControllerChange,
      );
    };
  }, []);

  return null;
}
