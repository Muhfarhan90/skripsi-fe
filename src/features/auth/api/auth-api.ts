import { apiMessageOnly, apiRequest } from "@/lib/api/client";
import { getApiBaseUrl } from "@/lib/env";
import type {
  AuthUser,
  ForgotPasswordRequest,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  ResendVerificationRequest,
  ResendVerificationResponse,
  ResetPasswordRequest,
  UserDevicePayload,
} from "@/types/auth";

function getApiOrigin(): string {
  return new URL(getApiBaseUrl()).origin;
}

function getTrustedVerifyUrl(rawUrl: string): string | null {
  try {
    const candidate = new URL(rawUrl);
    const trustedOrigin = getApiOrigin();
    const hasValidPath = candidate.pathname.includes("/auth/verify-email/");
    const hasValidProtocol =
      candidate.protocol === "https:" ||
      (process.env.NODE_ENV !== "production" && candidate.protocol === "http:");

    if (candidate.origin !== trustedOrigin || !hasValidPath || !hasValidProtocol) {
      return null;
    }

    return candidate.toString();
  } catch {
    return null;
  }
}

export function login(payload: LoginRequest) {
  return apiRequest<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function register(payload: Omit<RegisterRequest, "role_id">) {
  // Public registration is fixed to student role (role_id=3) by product decision.
  return apiRequest<RegisterResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ ...payload, role_id: 3 }),
  });
}

export function logout() {
  return apiMessageOnly("/api/auth/logout", {
    method: "POST",
  });
}

export function getCurrentUser() {
  return apiRequest<AuthUser>("/api/auth/me", {
    method: "GET",
  });
}

export function registerCurrentDevice(payload: UserDevicePayload) {
  return apiMessageOnly("/api/auth/devices", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deactivateCurrentDevice(deviceId: string) {
  return apiMessageOnly(`/api/auth/devices/${encodeURIComponent(deviceId)}`, {
    method: "DELETE",
  });
}

export function resendVerificationEmail(payload: ResendVerificationRequest) {
  return apiRequest<ResendVerificationResponse>(
    "/auth/resend-verification-email",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function forgotPassword(payload: ForgotPasswordRequest) {
  return apiMessageOnly("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function resetPassword(payload: ResetPasswordRequest) {
  return apiMessageOnly("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function verifyEmailWithParams(params: {
  id: string;
  hash: string;
  expires?: string | null;
  signature?: string | null;
}) {
  const query = new URLSearchParams();
  if (params.expires) query.set("expires", params.expires);
  if (params.signature) query.set("signature", params.signature);

  const queryString = query.toString();
  const endpoint = `/auth/verify-email/${params.id}/${params.hash}${queryString ? `?${queryString}` : ""}`;
  return apiMessageOnly(endpoint, { method: "GET" });
}

export async function verifyEmailWithAbsoluteUrl(verifyUrl: string) {
  const trustedVerifyUrl = getTrustedVerifyUrl(verifyUrl);

  if (!trustedVerifyUrl) {
    throw new Error("Link verifikasi tidak valid atau tidak terpercaya");
  }

  const response = await fetch(trustedVerifyUrl, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  const payload = (await response.json().catch(() => null)) as {
    success?: boolean;
    message?: string;
    errors?: Record<string, string[] | number[]>;
  } | null;

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message ?? "Verification failed");
  }

  return payload.message ?? "Email verified";
}
