import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/features/auth/lib/constants";
import { buildApiUrl, getAuthCookieOptions } from "@/features/auth/lib/server";

function resolveTargetPath(pathSegments: string[] | undefined): string | null {
  if (!pathSegments || pathSegments.length === 0) {
    return null;
  }

  const [resource, second, third, fourth, fifth, sixth, seventh, eighth] = pathSegments;

  if (resource === "cart") {
    if (pathSegments.length === 1) return "/cart";
    if (pathSegments.length === 2 && second === "items") return "/cart/items";
    if (pathSegments.length === 3 && second === "items" && third) return `/cart/items/${third}`;
    if (pathSegments.length === 2 && second === "apply-voucher") return "/cart/apply-voucher";
    if (pathSegments.length === 2 && second === "checkout") return "/cart/checkout";
  }

  if (resource === "orders") {
    if (pathSegments.length === 1) return "/orders";
    if (pathSegments.length === 2 && second) return `/orders/${second}`;
    if (pathSegments.length === 3 && second && third === "payment-submission") {
      return `/orders/${second}/payment-submission`;
    }
  }

  if (resource === "certificates") {
    if (pathSegments.length === 1) return "/certificates";
  }

  if (resource === "courses") {
    if (pathSegments.length === 3 && second && third === "reviews") {
      return `/courses/${second}/reviews`;
    }
    if (pathSegments.length === 4 && second && third === "reviews" && fourth) {
      return `/courses/${second}/reviews/${fourth}`;
    }
  }

  if (resource === "enrollments") {
    if (pathSegments.length === 1) return "/enrollments";
    if (pathSegments.length === 2 && second) return `/enrollments/${second}`;
    if (pathSegments.length === 4 && second && third === "lessons" && fourth) {
      return `/enrollments/${second}/lessons/${fourth}`;
    }
    if (pathSegments.length === 3 && second && third === "assignments") {
      return `/enrollments/${second}/assignments`;
    }
    if (pathSegments.length === 4 && second && third === "assignments" && fourth) {
      return `/enrollments/${second}/assignments/${fourth}`;
    }
    if (pathSegments.length === 5 && second && third === "assignments" && fourth && fifth === "submit") {
      return `/enrollments/${second}/assignments/${fourth}/submit`;
    }
    if (pathSegments.length === 4 && second && third === "quizzes" && fourth) {
      return `/enrollments/${second}/quizzes/${fourth}`;
    }
    if (pathSegments.length === 3 && second && third === "progress-summary") {
      return `/enrollments/${second}/progress-summary`;
    }
    if (pathSegments.length === 3 && second && third === "curriculum") {
      return `/enrollments/${second}/curriculum`;
    }
    if (pathSegments.length === 3 && second && third === "next-lesson") {
      return `/enrollments/${second}/next-lesson`;
    }
    if (pathSegments.length === 3 && second && third === "complete") {
      return `/enrollments/${second}/complete`;
    }
    if (pathSegments.length === 3 && second && third === "certificate") {
      return `/enrollments/${second}/certificate`;
    }
    if (pathSegments.length === 3 && second && third === "lesson-progress") {
      return `/enrollments/${second}/lesson-progress`;
    }
    if (pathSegments.length === 4 && second && third === "lesson-progress" && fourth) {
      return `/enrollments/${second}/lesson-progress/${fourth}`;
    }
    if (
      pathSegments.length === 5 &&
      second &&
      third === "quizzes" &&
      fourth &&
      fifth === "attempts"
    ) {
      return `/enrollments/${second}/quizzes/${fourth}/attempts`;
    }
    if (
      pathSegments.length === 6 &&
      second &&
      third === "quizzes" &&
      fourth &&
      fifth === "attempts" &&
      sixth
    ) {
      return `/enrollments/${second}/quizzes/${fourth}/attempts/${sixth}`;
    }
    if (
      pathSegments.length === 7 &&
      second &&
      third === "quizzes" &&
      fourth &&
      fifth === "attempts" &&
      sixth &&
      seventh === "submit"
    ) {
      return `/enrollments/${second}/quizzes/${fourth}/attempts/${sixth}/submit`;
    }
    if (
      pathSegments.length === 8 &&
      second &&
      third === "quizzes" &&
      fourth &&
      fifth === "attempts" &&
      sixth &&
      seventh === "answers" &&
      eighth
    ) {
      return `/enrollments/${second}/quizzes/${fourth}/attempts/${sixth}/answers/${eighth}`;
    }
  }

  return null;
}

async function proxyStudentRequest(
  request: NextRequest,
  pathSegments: string[] | undefined,
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

  const targetPath = resolveTargetPath(pathSegments);
  if (!targetPath) {
    return NextResponse.json(
      {
        success: false,
        message: "Student API path is not allowed",
      },
      { status: 404 },
    );
  }

  const incomingUrl = new URL(request.url);
  const query = incomingUrl.search || "";

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

  const upstream = await fetch(buildApiUrl(`${targetPath}${query}`), {
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

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return proxyStudentRequest(request, path);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return proxyStudentRequest(request, path);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return proxyStudentRequest(request, path);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return proxyStudentRequest(request, path);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return proxyStudentRequest(request, path);
}
