"use client";

import { useEffect } from "react";
import { registerAppServiceWorker } from "@/lib/service-worker";

function logPwaDebug(message: string, detail?: unknown) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  if (detail === undefined) {
    console.warn(`[PWA] ${message}`);
    return;
  }

  console.warn(`[PWA] ${message}`, detail);
}

export function PwaBootstrap() {
  useEffect(() => {
    let isCancelled = false;

    void registerAppServiceWorker()
      .then((registration) => {
        if (isCancelled || !registration) {
          return;
        }

        logPwaDebug("Service worker registered.", registration.scope);
      })
      .catch((error: unknown) => {
        if (isCancelled) {
          return;
        }

        logPwaDebug("Service worker registration failed.", error);
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  return null;
}
