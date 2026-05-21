import { NextResponse } from "next/server";
import { getFirebaseWebConfig } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FIREBASE_COMPAT_SDK_VERSION = "10.13.2";

export function GET() {
  const firebaseConfig = JSON.stringify(getFirebaseWebConfig());

  const script = `
let lastNotificationFingerprint = null;
let lastNotificationAt = 0;

function broadcastIncomingNotification(payload) {
  return clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
    for (const client of clientList) {
      client.postMessage({
        type: "fcm-background-message",
        payload,
      });
    }
  });
}

function normalizePayload(payload) {
  const notification = payload && payload.notification ? payload.notification : {};
  const data = payload && payload.data ? payload.data : {};
  const fcmOptions = payload && payload.fcmOptions ? payload.fcmOptions : {};
  const title = notification.title || data.title || "Notifikasi baru";
  const body = notification.body || data.body || "";
  const clickAction =
    notification.click_action ||
    data.click_action ||
    data.route ||
    fcmOptions.link ||
    "/";
  const icon = notification.icon || data.icon || "/globe.svg";
  const badge = notification.badge || data.badge || "/globe.svg";

  return {
    title,
    body,
    clickAction,
    icon,
    badge,
    data,
  };
}

function shouldSkipDuplicateNotification(payload) {
  const normalized = normalizePayload(payload);
  const fingerprint =
    (normalized.data && normalized.data.notification_id) ||
    [normalized.title, normalized.body, normalized.clickAction].join("|");
  const now = Date.now();

  if (
    lastNotificationFingerprint === fingerprint &&
    now - lastNotificationAt < 2000
  ) {
    return true;
  }

  lastNotificationFingerprint = fingerprint;
  lastNotificationAt = now;

  return false;
}

function showIncomingNotification(payload) {
  if (!payload || shouldSkipDuplicateNotification(payload)) {
    return Promise.resolve();
  }

  const normalized = normalizePayload(payload);

  return self.registration.showNotification(normalized.title, {
    body: normalized.body,
    icon: normalized.icon,
    badge: normalized.badge,
    tag:
      (normalized.data && normalized.data.notification_id)
        ? "notification-" + normalized.data.notification_id
        : undefined,
    renotify: false,
    requireInteraction: true,
    data: {
      click_action: normalized.clickAction,
      ...normalized.data,
    },
  }).catch(function (error) {
    console.error("[firebase-messaging-sw.js] showNotification failed", error);
  }).then(function () {
    return broadcastIncomingNotification(payload);
  });
}

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  const clickAction = event.notification && event.notification.data
    ? event.notification.data.click_action || "/"
    : "/";
  const targetUrl = new URL(clickAction, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      for (const client of clientList) {
        if (client.url === targetUrl && "focus" in client) {
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }

      return undefined;
    })
  );
});

self.addEventListener("push", function (event) {
  if (!event.data) {
    return;
  }

  let payload = null;

  try {
    payload = event.data.json();
  } catch (error) {
    console.warn("[firebase-messaging-sw.js] Failed to parse push payload", error);
    return;
  }

  event.waitUntil(showIncomingNotification(payload));
});

importScripts("https://www.gstatic.com/firebasejs/${FIREBASE_COMPAT_SDK_VERSION}/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/${FIREBASE_COMPAT_SDK_VERSION}/firebase-messaging-compat.js");

firebase.initializeApp(${firebaseConfig});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
  return showIncomingNotification(payload);
});
`.trim();

  return new NextResponse(script, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Service-Worker-Allowed": "/",
    },
  });
}
