const DEVICE_ID_STORAGE_KEY = "skripsi:fcm-device-id";

function readStorageValue(key: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorageValue(key: string, value: string): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage write failures and keep the in-memory value for this session.
  }
}

function generateBrowserDeviceId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `web-${crypto.randomUUID()}`;
  }

  return `web-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getStoredBrowserDeviceId(): string | null {
  return readStorageValue(DEVICE_ID_STORAGE_KEY);
}

export function getOrCreateBrowserDeviceId(): string | null {
  const existingDeviceId = getStoredBrowserDeviceId();
  if (existingDeviceId) {
    return existingDeviceId;
  }

  const deviceId = generateBrowserDeviceId();
  writeStorageValue(DEVICE_ID_STORAGE_KEY, deviceId);

  return deviceId;
}

export function getBrowserDeviceInfo(): Record<string, string | string[]> {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return {};
  }

  const deviceInfo: Record<string, string | string[]> = {};

  if (navigator.userAgent) {
    deviceInfo.user_agent = navigator.userAgent;
  }

  if (navigator.platform) {
    deviceInfo.platform = navigator.platform;
  }

  if (navigator.language) {
    deviceInfo.language = navigator.language;
  }

  if (navigator.languages.length > 0) {
    deviceInfo.languages = [...navigator.languages];
  }

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (timezone) {
    deviceInfo.timezone = timezone;
  }

  return deviceInfo;
}
