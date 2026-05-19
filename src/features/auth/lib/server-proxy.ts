import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/features/auth/lib/constants";
import { buildApiUrl, getAuthCookieOptions } from "@/features/auth/lib/server";

export async function proxyAuthenticatedApiRequest(
  request: NextRequest,
  endpoint: string,
): Promise<NextResponse> {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json(
      {
        success: false,
        message: "Unauthorized",
      },
      { status: 401 },
    );
  }

  const headers: HeadersInit = {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };

  let body: string | undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    body = await request.text();
    const contentType = request.headers.get("content-type");

    if (contentType) {
      headers["Content-Type"] = contentType;
    }
  }

  const incomingUrl = new URL(request.url);
  const query = incomingUrl.search || "";

  const upstream = await fetch(buildApiUrl(`${endpoint}${query}`), {
    method: request.method,
    headers,
    body,
    cache: "no-store",
  });

  const payload = await upstream.json().catch(() => ({
    success: false,
    message: `Request failed with status ${upstream.status}`,
  }));

  const response = NextResponse.json(payload, {
    status: upstream.status || 500,
  });

  if (upstream.status === 401 || upstream.status === 403) {
    response.cookies.set(AUTH_COOKIE_NAME, "", {
      ...getAuthCookieOptions(),
      maxAge: 0,
    });
  }

  return response;
}
