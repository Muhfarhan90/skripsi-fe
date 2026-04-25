import { cookies } from "next/headers";
import type { AuthUser } from "@/types/auth";
import { getApiBaseUrl } from "@/lib/env";
import { AUTH_COOKIE_NAME } from "@/features/auth/lib/constants";

interface ApiEnvelope<T> {
  success?: boolean;
  message?: string;
  data?: T;
}

export function buildApiUrl(endpoint: string): string {
  const base = getApiBaseUrl().replace(/\/$/, "");
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${base}${path}`;
}

export function getAuthCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
}

function normalizeCurrentUserPayload(payload: unknown): AuthUser | null {
  if (!payload || typeof payload !== "object") return null;

  if ("success" in payload) {
    const envelope = payload as ApiEnvelope<AuthUser>;
    if (!envelope.success || !envelope.data) return null;
    return envelope.data;
  }

  return payload as AuthUser;
}

export async function getCurrentUserByToken(token: string): Promise<AuthUser | null> {
  const response = await fetch(buildApiUrl("/user"), {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!response.ok) return null;

  const payload = await response.json().catch(() => null);
  return normalizeCurrentUserPayload(payload);
}

export async function getServerCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  return getCurrentUserByToken(token);
}
