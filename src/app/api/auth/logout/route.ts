import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/features/auth/lib/constants";
import { buildApiUrl, getAuthCookieOptions } from "@/features/auth/lib/server";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (token) {
    await fetch(buildApiUrl("/auth/logout"), {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    }).catch(() => null);
  }

  const response = NextResponse.json({
    success: true,
    message: "Logout berhasil",
  });

  response.cookies.set(AUTH_COOKIE_NAME, "", {
    ...getAuthCookieOptions(),
    maxAge: 0,
  });

  return response;
}
