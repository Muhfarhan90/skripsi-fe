import { NextResponse } from "next/server";
import { getFirebaseWebConfig } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FIREBASE_COMPAT_SDK_VERSION = "10.13.2";
const ENABLE_OFFLINE = process.env.NODE_ENV === "production";

export function GET() {
  const firebaseConfig = JSON.stringify(getFirebaseWebConfig());

  const script = `
const ENABLE_OFFLINE = ${JSON.stringify(ENABLE_OFFLINE)};
const STATIC_CACHE = "lms-static-v1";
const RUNTIME_CACHE = "lms-runtime-v1";
const OFFLINE_URL = "/offline";
const CORE_ASSETS = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/app-icon-192.png",
  "/app-icon-512.png",
  "/app-icon-maskable-192.png",
  "/app-icon-maskable-512.png",
  "/apple-touch-icon.png",
];

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
  const icon = notification.icon || data.icon || "/app-icon-192.png";
  const badge = notification.badge || data.badge || "/app-icon-maskable-192.png";

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

self.addEventListener("install", function (event) {
  if (!ENABLE_OFFLINE) {
    self.skipWaiting();
    return;
  }

  event.waitUntil(
    caches.open(STATIC_CACHE).then(function (cache) {
      return cache.addAll(CORE_ASSETS);
    }).catch(function () {
      return undefined;
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.map(function (key) {
          if (key === STATIC_CACHE || key === RUNTIME_CACHE) {
            return undefined;
          }

          return caches.delete(key);
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("message", function (event) {
  if (event.data && event.data.type === "skip-waiting") {
    self.skipWaiting();
  }
});

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

function isCacheableStaticAsset(requestUrl, request) {
  if (request.method !== "GET") {
    return false;
  }

  if (requestUrl.origin !== self.location.origin) {
    return false;
  }

  if (requestUrl.pathname === "/firebase-messaging-sw.js") {
    return false;
  }

  if (requestUrl.pathname.startsWith("/api/")) {
    return false;
  }

  if (requestUrl.pathname.startsWith("/_next/static/")) {
    return true;
  }

  return ["script", "style", "font", "image"].includes(request.destination);
}

function respondWithOfflineFallback() {
  return caches.match(OFFLINE_URL).then(function (response) {
    if (response) {
      return response;
    }

    return new Response(
      "<!doctype html><html lang=\\"id\\"><head><meta charset=\\"utf-8\\"><meta name=\\"viewport\\" content=\\"width=device-width,initial-scale=1\\"><title>Offline</title><style>body{margin:0;font-family:Poppins,Arial,sans-serif;background:#f8fafc;color:#0f172a;display:grid;min-height:100vh;place-items:center;padding:24px}.card{max-width:560px;background:white;border-radius:24px;padding:32px;box-shadow:0 20px 60px rgba(15,23,42,.12)}h1{margin:0 0 16px;font-size:clamp(2rem,5vw,3rem)}p{margin:0;color:#475569;line-height:1.7}</style></head><body><section class=\\"card\\"><h1>Anda sedang offline</h1><p>Aplikasi masih terbuka, tetapi data terbaru belum dapat diambil sampai koneksi kembali tersedia.</p></section></body></html>",
      {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
      }
    );
  });
}

self.addEventListener("fetch", function (event) {
  if (!ENABLE_OFFLINE) {
    return;
  }

  if (event.request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(event.request.url);

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(function () {
        return respondWithOfflineFallback();
      })
    );
    return;
  }

  if (!isCacheableStaticAsset(requestUrl, event.request)) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(function (cachedResponse) {
      const networkResponsePromise = fetch(event.request).then(function (networkResponse) {
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        void caches.open(RUNTIME_CACHE).then(function (cache) {
          return cache.put(event.request, responseToCache);
        });

        return networkResponse;
      });

      if (cachedResponse) {
        void networkResponsePromise.catch(function () {
          return undefined;
        });
        return cachedResponse;
      }

      return networkResponsePromise;
    })
  );
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
