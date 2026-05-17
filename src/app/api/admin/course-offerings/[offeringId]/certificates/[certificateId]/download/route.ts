import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/features/auth/lib/constants";
import { buildApiUrl, getAuthCookieOptions } from "@/features/auth/lib/server";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ offeringId: string; certificateId: string }> },
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

  const { offeringId, certificateId } = await context.params;
  const upstream = await fetch(
    buildApiUrl(`/admin/course-offerings/${offeringId}/certificates/${certificateId}/download`),
    {
      method: "GET",
      headers: {
        Accept: "application/pdf",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    },
  );

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

  const pdfBytes = await upstream.arrayBuffer();
  const headers = new Headers();
  headers.set("Content-Type", upstream.headers.get("content-type") ?? "application/pdf");

  const contentDisposition = upstream.headers.get("content-disposition");
  if (contentDisposition) {
    headers.set("Content-Disposition", contentDisposition);
  }

  return new NextResponse(pdfBytes, {
    status: upstream.status,
    headers,
  });
}
