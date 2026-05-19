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

export function getFirebaseApp(): FirebaseApp {
  if (firebaseApp) {
    return firebaseApp;
  }

  firebaseApp = getApps().length > 0 ? getApp() : initializeApp(getFirebaseWebConfig());

  return firebaseApp;
}

export async function getFirebaseMessaging(): Promise<Messaging | null> {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return null;
  }

  if (!messagingPromise) {
    messagingPromise = isSupported().then((supported: boolean) => {
      if (!supported) {
        return null;
      }

      return getMessaging(getFirebaseApp());
    });
  }

  return messagingPromise;
}

export async function registerFirebaseMessagingServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  return navigator.serviceWorker.register("/firebase-messaging-sw.js", {
    scope: "/",
    updateViaCache: "none",
  });
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }

  if (Notification.permission === "granted" || Notification.permission === "denied") {
    return Notification.permission;
  }

  return Notification.requestPermission();
}

export async function getFirebaseMessagingToken(): Promise<string | null> {
  const permission = await requestNotificationPermission();
  if (permission !== "granted") {
    return null;
  }

  const messaging = await getFirebaseMessaging();
  if (!messaging) {
    return null;
  }

  const serviceWorkerRegistration = await registerFirebaseMessagingServiceWorker();
  if (!serviceWorkerRegistration) {
    return null;
  }

  return getToken(messaging, {
    vapidKey: getFirebaseVapidKey(),
    serviceWorkerRegistration,
  });
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
