"use client";

import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getCurrentUser } from "@/features/auth/api/auth-api";
import { getOrCreateBrowserDeviceId } from "@/features/auth/lib/device";
import { syncCurrentBrowserFcmDevice } from "@/features/auth/lib/fcm-device-sync";
import { ApiError } from "@/lib/api/client";
import { subscribeToForegroundMessages } from "@/lib/firebase";
import { notificationQueryKeys } from "@/features/notifications/api/notification-api";
import { useAuthStore } from "@/features/auth/store/auth-store";
import {
  clearStoredAuthToken,
  hasStoredAuthToken,
} from "@/features/auth/lib/token-storage";

function invalidateNotificationQueries(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: notificationQueryKeys.all });
  void queryClient.refetchQueries({ queryKey: notificationQueryKeys.all, type: "active" });
}

export function AuthBootstrap() {
  const queryClient = useQueryClient();
  const hasToken = hasStoredAuthToken();
  const user = useAuthStore((state) => state.user);
  const userId = user?.id ?? null;
  const sessionChecked = useAuthStore((state) => state.sessionChecked);
  const setUser = useAuthStore((state) => state.setUser);
  const setSessionChecked = useAuthStore((state) => state.setSessionChecked);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const syncedDeviceKeyRef = useRef<string | null>(null);

  const currentUserQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: getCurrentUser,
    enabled: !sessionChecked && hasToken,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 4000),
    staleTime: 60_000,
  });
  const isUnauthorized =
    currentUserQuery.error instanceof ApiError &&
    (currentUserQuery.error.status === 401 || currentUserQuery.error.status === 403);

  useEffect(() => {
    if (sessionChecked || hasToken) {
      return;
    }

    clearAuth();
  }, [clearAuth, hasToken, sessionChecked]);

  useEffect(() => {
    if (currentUserQuery.data) {
      setUser(currentUserQuery.data);
    }
  }, [currentUserQuery.data, setUser]);

  useEffect(() => {
    // Clear auth state only when token is actually unauthorized.
    if (isUnauthorized) {
      clearStoredAuthToken();
      clearAuth();
    }
  }, [clearAuth, isUnauthorized]);

  useEffect(() => {
    if (sessionChecked) return;
    if (!hasToken || currentUserQuery.isSuccess || isUnauthorized) {
      setSessionChecked(true);
    }
  }, [currentUserQuery.isSuccess, hasToken, isUnauthorized, sessionChecked, setSessionChecked]);

  useEffect(() => {
    if (!sessionChecked || !userId) {
      syncedDeviceKeyRef.current = null;
      return;
    }

    const deviceId = getOrCreateBrowserDeviceId();
    if (!deviceId) {
      return;
    }

    const syncKey = `${userId}:${deviceId}`;
    if (syncedDeviceKeyRef.current === syncKey) {
      return;
    }

    let isCancelled = false;

    void (async () => {
      const didSync = await syncCurrentBrowserFcmDevice();

      if (isCancelled) {
        return;
      }

      if (!didSync) {
        syncedDeviceKeyRef.current = null;
        console.warn("FCM token was not available after repeated sync attempts.");
        return;
      }

      syncedDeviceKeyRef.current = syncKey;
    })().catch((error: unknown) => {
      syncedDeviceKeyRef.current = null;
      console.error("Failed to sync FCM device token", error);
    });

    return () => {
      isCancelled = true;
    };
  }, [sessionChecked, userId]);

  useEffect(() => {
    if (!sessionChecked || !userId) {
      return;
    }

    let isCancelled = false;
    let unsubscribe: (() => void) | null = null;

    void subscribeToForegroundMessages((payload) => {
      invalidateNotificationQueries(queryClient);

      const title = payload.notification?.title ?? "Notifikasi baru";
      const description = payload.notification?.body;
      const notificationLink =
        payload.fcmOptions?.link ??
        payload.data?.click_action ??
        payload.data?.route ??
        null;
      const isDocumentHidden =
        typeof document !== "undefined" && document.visibilityState === "hidden";
      const shouldShowToast =
        typeof document === "undefined" ||
        document.visibilityState === "visible" ||
        document.hasFocus();

      // Some browsers still deliver messages to the page while the document
      // is hidden or the window is minimized. In that case, raise a system
      // notification instead of only showing the in-app toast.
      if (
        isDocumentHidden &&
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        const systemNotification = new Notification(title, {
          body: description,
          icon: payload.notification?.icon ?? "/globe.svg",
          tag: payload.data?.notification_id,
        });

        if (notificationLink) {
          systemNotification.onclick = () => {
            systemNotification.close();
            window.focus();
            window.location.assign(new URL(notificationLink, window.location.origin).toString());
          };
        }
      }

      if (shouldShowToast && description) {
        toast.info(title, { description });
        return;
      }

      if (shouldShowToast) {
        toast.info(title);
      }
    }).then((subscription) => {
      if (isCancelled) {
        subscription?.();
        return;
      }

      unsubscribe = subscription;
    });

    return () => {
      isCancelled = true;
      unsubscribe?.();
    };
  }, [queryClient, sessionChecked, userId]);

  useEffect(() => {
    if (!sessionChecked || !userId || typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type !== "fcm-background-message") {
        return;
      }

      invalidateNotificationQueries(queryClient);
    };

    navigator.serviceWorker.addEventListener("message", handleServiceWorkerMessage);

    return () => {
      navigator.serviceWorker.removeEventListener("message", handleServiceWorkerMessage);
    };
  }, [queryClient, sessionChecked, userId]);

  return null;
}
