import { NextRequest, NextResponse } from "next/server";
import { buildApiUrl } from "@/features/auth/lib/server";

function resolveTargetPath(pathSegments: string[] | undefined): string | null {
  if (!pathSegments || pathSegments.length === 0) {
    return null;
  }

  const [resource, slug] = pathSegments;

  if (resource === "courses" && pathSegments.length === 1) {
    return "/courses";
  }

  if (resource === "courses" && pathSegments.length === 2 && slug) {
    return `/courses/${slug}`;
  }

  return null;
}

async function proxyPublicRequest(
  request: NextRequest,
  pathSegments: string[] | undefined,
): Promise<NextResponse> {
  const targetPath = resolveTargetPath(pathSegments);
  if (!targetPath) {
    return NextResponse.json(
      {
        success: false,
        message: "Public API path is not allowed",
      },
      { status: 404 },
    );
  }

  const incomingUrl = new URL(request.url);
  const query = incomingUrl.search || "";

  const upstream = await fetch(buildApiUrl(`${targetPath}${query}`), {
    method: request.method,
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const payload = await upstream.json().catch(() => ({
    success: false,
    message: `Request failed with status ${upstream.status}`,
  }));

  return NextResponse.json(payload, {
    status: upstream.status || 500,
  });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return proxyPublicRequest(request, path);
}

