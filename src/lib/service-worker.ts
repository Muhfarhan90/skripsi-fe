"use client";

export const APP_SERVICE_WORKER_PATH = "/firebase-messaging-sw.js";

function waitForWorkerState(
  worker: ServiceWorker,
  expectedState: ServiceWorkerState,
): Promise<void> {
  if (worker.state === expectedState) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const handleStateChange = () => {
      if (worker.state === expectedState) {
        worker.removeEventListener("statechange", handleStateChange);
        resolve();
        return;
      }

      if (worker.state === "redundant") {
        worker.removeEventListener("statechange", handleStateChange);
        reject(new Error("Service worker became redundant before activation."));
      }
    };

    worker.addEventListener("statechange", handleStateChange);
  });
}

async function waitForServiceWorkerActivation(
  registration: ServiceWorkerRegistration,
): Promise<ServiceWorkerRegistration> {
  if (registration.active) {
    return registration;
  }

  const worker = registration.installing ?? registration.waiting;
  if (worker) {
    await waitForWorkerState(worker, "activated");
    return registration;
  }

  const readyRegistration = await navigator.serviceWorker.ready;

  if (!readyRegistration.active) {
    throw new Error("Service worker registered but did not become active.");
  }

  return readyRegistration;
}

export async function registerAppServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  const registration = await navigator.serviceWorker.register(APP_SERVICE_WORKER_PATH, {
    scope: "/",
    updateViaCache: "none",
  });

  return waitForServiceWorkerActivation(registration);
}
