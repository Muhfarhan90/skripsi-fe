import { ApiError, apiMessageOnly, apiRequest } from "@/lib/api/client";
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
} from "@/types/auth";

export function login(payload: LoginRequest) {
  return apiRequest<LoginResponse>("/auth/login", {
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

export function logout(token: string) {
  return apiMessageOnly("/auth/logout", {
    method: "POST",
    token,
  });
}

export function getCurrentUser(token: string) {
  // /api/user in Laravel commonly returns raw user object (not success envelope).
  // This handler supports both wrapped and raw response formats.
  return fetch(
    `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api"}/user`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    },
  ).then(async (response) => {
    const payload = (await response.json().catch(() => null)) as
      | AuthUser
      | {
          success?: boolean;
          message?: string;
          data?: AuthUser;
          errors?: Record<string, string[] | number[]>;
        }
      | null;

    if (!response.ok) {
      const message =
        payload && typeof payload === "object" && "message" in payload
          ? payload.message
          : `Request failed with status ${response.status}`;
      const errors =
        payload && typeof payload === "object" && "errors" in payload
          ? payload.errors
          : undefined;
      throw new ApiError(message || "Unauthorized", response.status, errors);
    }

    if (payload && typeof payload === "object" && "success" in payload) {
      if (!payload.success) {
        throw new ApiError(
          payload.message || "Failed to fetch current user",
          response.status,
          payload.errors,
        );
      }
      return payload.data as AuthUser;
    }

    return payload as AuthUser;
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
  const response = await fetch(verifyUrl, {
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
