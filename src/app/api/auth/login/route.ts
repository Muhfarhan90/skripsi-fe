import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/features/auth/lib/constants";
import { buildApiUrl, getAuthCookieOptions } from "@/features/auth/lib/server";
import type { AuthUser } from "@/types/auth";

interface LoginPayload {
  success?: boolean;
  message?: string;
  errors?: Record<string, string[] | number[]>;
  data?: {
    token?: string;
    user?: AuthUser;
  };
}

export async function POST(request: NextRequest) {
  const body = await request.text();

  const upstream = await fetch(buildApiUrl("/auth/login"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body,
    cache: "no-store",
  });

  const payload = (await upstream.json().catch(() => null)) as LoginPayload | null;

  if (!upstream.ok || !payload?.success || !payload.data?.token || !payload.data.user) {
    const status = upstream.status || 500;
    return NextResponse.json(
      payload ?? {
        success: false,
        message: `Request failed with status ${status}`,
      },
      { status },
    );
  }

  const response = NextResponse.json({
    success: true,
    message: payload.message ?? "Login berhasil",
    data: {
      user: payload.data.user,
    },
  });

  response.cookies.set(AUTH_COOKIE_NAME, payload.data.token, getAuthCookieOptions());
  return response;
}
