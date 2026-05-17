import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/features/auth/lib/constants";
import { buildApiUrl, getAuthCookieOptions } from "@/features/auth/lib/server";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
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

  const { id } = await context.params;
  const upstream = await fetch(buildApiUrl(`/certificates/${id}/preview`), {
    method: "GET",
    headers: {
      Accept: "text/html",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!upstream.ok) {
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

  const html = await upstream.text();

  return new NextResponse(html, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "text/html; charset=UTF-8",
    },
  });
}
