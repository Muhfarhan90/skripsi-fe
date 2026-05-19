"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getCurrentUser,
  registerCurrentDevice,
} from "@/features/auth/api/auth-api";
import {
  getBrowserDeviceInfo,
  getOrCreateBrowserDeviceId,
} from "@/features/auth/lib/device";
import { ApiError } from "@/lib/api/client";
import {
  getFirebaseMessagingToken,
  subscribeToForegroundMessages,
} from "@/lib/firebase";
import { useAuthStore } from "@/features/auth/store/auth-store";

export function AuthBootstrap() {
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
    enabled: !sessionChecked,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 4000),
    staleTime: 60_000,
  });
  const isUnauthorized =
    currentUserQuery.error instanceof ApiError &&
    (currentUserQuery.error.status === 401 || currentUserQuery.error.status === 403);

  useEffect(() => {
    if (currentUserQuery.data) {
      setUser(currentUserQuery.data);
    }
  }, [currentUserQuery.data, setUser]);

  useEffect(() => {
    // Clear auth state only when token is actually unauthorized.
    if (isUnauthorized) {
      clearAuth();
    }
  }, [clearAuth, isUnauthorized]);

  useEffect(() => {
    if (sessionChecked) return;
    if (!currentUserQuery.isSuccess && !isUnauthorized) return;
    setSessionChecked(true);
  }, [currentUserQuery.isSuccess, isUnauthorized, sessionChecked, setSessionChecked]);

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

    syncedDeviceKeyRef.current = syncKey;

    let isCancelled = false;

    void (async () => {
      const fcmToken = await getFirebaseMessagingToken();

      if (!fcmToken || isCancelled) {
        return;
      }

      await registerCurrentDevice({
        device_id: deviceId,
        device_type: "web",
        fcm_token: fcmToken,
        device_info: getBrowserDeviceInfo(),
      });
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
      const title = payload.notification?.title ?? "Notifikasi baru";
      const description = payload.notification?.body;

      if (description) {
        toast.info(title, { description });
        return;
      }

      toast.info(title);
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
  }, [sessionChecked, userId]);

  return null;
}
