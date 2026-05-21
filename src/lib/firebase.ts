import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  deleteToken,
  getMessaging,
  getToken,
  isSupported,
  onMessage,
  type MessagePayload,
  type Messaging,
  type Unsubscribe,
} from "firebase/messaging";
import { getFirebaseVapidKey, getFirebaseWebConfig } from "@/lib/env";

let firebaseApp: FirebaseApp | null = null;
let messagingPromise: Promise<Messaging | null> | null = null;

function logFcmDebug(message: string, detail?: unknown) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  if (detail === undefined) {
    console.warn(`[FCM] ${message}`);
    return;
  }

  console.warn(`[FCM] ${message}`, detail);
}

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
        reject(new Error("Firebase messaging service worker became redundant before activation."));
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
    throw new Error("Firebase messaging service worker registered but did not become active.");
  }

  return readyRegistration;
}

export function getFirebaseApp(): FirebaseApp {
  if (firebaseApp) {
    return firebaseApp;
  }

  firebaseApp = getApps().length > 0 ? getApp() : initializeApp(getFirebaseWebConfig());

  return firebaseApp;
}

export async function getFirebaseMessaging(): Promise<Messaging | null> {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    logFcmDebug("Messaging is unavailable because window or navigator is missing.");
    return null;
  }

  if (!messagingPromise) {
    messagingPromise = isSupported().then((supported: boolean) => {
      if (!supported) {
        logFcmDebug("firebase/messaging is not supported in this browser environment.");
        return null;
      }

      return getMessaging(getFirebaseApp());
    });
  }

  return messagingPromise;
}

export async function registerFirebaseMessagingServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    logFcmDebug("Service Worker API is not available in this browser.");
    return null;
  }

  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
    scope: "/",
    updateViaCache: "none",
  });

  return waitForServiceWorkerActivation(registration);
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    logFcmDebug("Notification API is not available in this browser.");
    return "denied";
  }

  if (Notification.permission === "granted" || Notification.permission === "denied") {
    logFcmDebug(`Notification permission is already '${Notification.permission}'.`);
    return Notification.permission;
  }

  const permission = await Notification.requestPermission();
  logFcmDebug(`Notification permission request resolved to '${permission}'.`);

  return permission;
}

export async function getFirebaseMessagingToken(): Promise<string | null> {
  const permission = await requestNotificationPermission();
  if (permission !== "granted") {
    logFcmDebug(`Skipping FCM token retrieval because permission is '${permission}'.`);
    return null;
  }

  const messaging = await getFirebaseMessaging();
  if (!messaging) {
    logFcmDebug("Skipping FCM token retrieval because messaging is unavailable.");
    return null;
  }

  const serviceWorkerRegistration = await registerFirebaseMessagingServiceWorker();
  if (!serviceWorkerRegistration) {
    logFcmDebug("Skipping FCM token retrieval because service worker registration is unavailable.");
    return null;
  }

  try {
    const token = await getToken(messaging, {
      vapidKey: getFirebaseVapidKey(),
      serviceWorkerRegistration,
    });

    if (!token) {
      logFcmDebug("Firebase returned an empty token.");
      return null;
    }

    return token;
  } catch (error: unknown) {
    logFcmDebug("getToken() failed.", error);
    return null;
  }
}

export async function revokeFirebaseMessagingToken(): Promise<boolean> {
  const messaging = await getFirebaseMessaging();
  if (!messaging) {
    return false;
  }

  return deleteToken(messaging);
}

export async function subscribeToForegroundMessages(
  listener: (payload: MessagePayload) => void,
): Promise<Unsubscribe | null> {
  const messaging = await getFirebaseMessaging();
  if (!messaging) {
    return null;
  }

  return onMessage(messaging, listener);
}
