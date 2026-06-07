import { AUTH_COOKIE_NAME } from "@/features/auth/lib/constants";

const AUTH_TOKEN_STORAGE_KEY = AUTH_COOKIE_NAME;

export function getStoredAuthToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const token = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)?.trim();
  return token ? token : null;
}

export function hasStoredAuthToken(): boolean {
  return Boolean(getStoredAuthToken());
}

export function setStoredAuthToken(token: string): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
}

export function clearStoredAuthToken(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
}
