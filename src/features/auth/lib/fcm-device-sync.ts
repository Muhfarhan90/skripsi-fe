"use client";

import { registerCurrentDevice } from "@/features/auth/api/auth-api";
import { getBrowserDeviceInfo, getOrCreateBrowserDeviceId } from "@/features/auth/lib/device";
import { getFirebaseMessagingToken } from "@/lib/firebase";

const FCM_SYNC_ATTEMPTS = 3;
const FCM_SYNC_RETRY_DELAY_MS = 1500;
let activeFcmSyncPromise: Promise<boolean> | null = null;

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export async function syncCurrentBrowserFcmDevice(): Promise<boolean> {
  if (activeFcmSyncPromise) {
    return activeFcmSyncPromise;
  }

  activeFcmSyncPromise = performFcmDeviceSync().finally(() => {
    activeFcmSyncPromise = null;
  });

  return activeFcmSyncPromise;
}

async function performFcmDeviceSync(): Promise<boolean> {
  const deviceId = getOrCreateBrowserDeviceId();
  if (!deviceId) {
    return false;
  }

  for (let attempt = 0; attempt < FCM_SYNC_ATTEMPTS; attempt += 1) {
    const fcmToken = await getFirebaseMessagingToken();

    if (!fcmToken) {
      if (attempt < FCM_SYNC_ATTEMPTS - 1) {
        await wait(FCM_SYNC_RETRY_DELAY_MS);
        continue;
      }

      return false;
    }

    await registerCurrentDevice({
      device_id: deviceId,
      device_type: "web",
      fcm_token: fcmToken,
      device_info: getBrowserDeviceInfo(),
    });

    return true;
  }

  return false;
}
