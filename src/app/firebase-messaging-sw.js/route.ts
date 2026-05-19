import { NextResponse } from "next/server";
import { getFirebaseWebConfig } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FIREBASE_COMPAT_SDK_VERSION = "10.13.2";

export function GET() {
  const firebaseConfig = JSON.stringify(getFirebaseWebConfig());

  const script = `
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

importScripts("https://www.gstatic.com/firebasejs/${FIREBASE_COMPAT_SDK_VERSION}/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/${FIREBASE_COMPAT_SDK_VERSION}/firebase-messaging-compat.js");

firebase.initializeApp(${firebaseConfig});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
  const notification = payload.notification || {};
  const data = payload.data || {};
  const title = notification.title || data.title || "Notifikasi baru";
  const clickAction = notification.click_action || data.click_action || data.route || "/";
  const icon = notification.icon || data.icon || "/globe.svg";
  const badge = notification.badge || data.badge || "/globe.svg";

  self.registration.showNotification(title, {
    body: notification.body || data.body || "",
    icon,
    badge,
    data: {
      click_action: clickAction,
      ...data,
    },
  });
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
