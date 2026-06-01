import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/features/auth/lib/constants";
import { buildApiUrl, getAuthCookieOptions } from "@/features/auth/lib/server";

const ALLOWED_ADMIN_RESOURCES = new Set([
  "dashboard",
  "activity-logs",
  "categories",
  "skills",
  "courses",
  "sections",
  "lessons",
  "quizzes",
  "questions",
  "options",
  "vouchers",
  "users",
  "roles",
  "orders",
  "enrollments",
  "transactions",
  "course-offerings",
  "academic-periods",
  "assignment-submissions",
  "certificate-settings",
  "website-settings",
  "website",
  "website-social-links",
  "website-pages",
  "website-sections",
  "faq-categories",
  "faqs",
  "forum-replies",
]);

function resolveTargetPath(pathSegments: string[] | undefined): string | null {
  if (!pathSegments || pathSegments.length === 0) {
    return null;
  }

  const [resource, maybeId, action] = pathSegments;
  if (!ALLOWED_ADMIN_RESOURCES.has(resource)) {
    return null;
  }

  if (pathSegments.length === 1) {
    return `/admin/${resource}`;
  }

  if (resource === "website" && pathSegments.length === 2 && maybeId === "home") {
    return "/admin/website/home";
  }

  if (pathSegments.length === 2 && maybeId) {
    if (resource === "certificate-settings" && maybeId === "assets") {
      return "/admin/certificate-settings/assets";
    }

    return `/admin/${resource}/${maybeId}`;
  }

  if (resource === "assignment-submissions" && pathSegments.length === 3 && maybeId && action === "review") {
    return `/admin/assignment-submissions/${maybeId}/review`;
  }

  // Allow selected nested actions for admin resources (strictly scoped).
  if (resource === "courses" && pathSegments.length === 3 && maybeId && action === "curriculum") {
    return `/admin/courses/${maybeId}/curriculum`;
  }

  if (resource === "courses" && pathSegments.length === 3 && maybeId && action === "quizzes") {
    return `/admin/courses/${maybeId}/quizzes`;
  }

  if (resource === "courses" && pathSegments.length === 3 && maybeId && action === "assignments") {
    return `/admin/courses/${maybeId}/assignments`;
  }

  if (resource === "courses" && pathSegments.length === 3 && maybeId && action === "forum") {
    return `/admin/courses/${maybeId}/forum`;
  }

  if (resource === "courses" && pathSegments.length === 4 && maybeId && action === "forum") {
    const [, , , postId] = pathSegments;
    if (postId) {
      return `/admin/courses/${maybeId}/forum/${postId}`;
    }
  }

  if (resource === "courses" && pathSegments.length === 5 && maybeId && action === "forum") {
    const [, , , postId, forumAction] = pathSegments;
    if (postId && forumAction === "replies") {
      return `/admin/courses/${maybeId}/forum/${postId}/replies`;
    }
    if (postId && forumAction === "pin") {
      return `/admin/courses/${maybeId}/forum/${postId}/pin`;
    }
  }

  if (resource === "courses" && pathSegments.length === 4 && maybeId && action === "assignments") {
    const [, , , assignmentId] = pathSegments;
    if (assignmentId) {
      return `/admin/courses/${maybeId}/assignments/${assignmentId}`;
    }
  }

  if (resource === "forum-replies" && pathSegments.length === 2 && maybeId) {
    return `/admin/forum-replies/${maybeId}`;
  }

  if (resource === "courses" && pathSegments.length === 5 && maybeId && action === "sections") {
    const [,, , sectionId, sectionAction] = pathSegments;
    if (sectionId && sectionAction === "quizzes") {
      return `/admin/courses/${maybeId}/sections/${sectionId}/quizzes`;
    }
  }

  if (resource === "courses" && pathSegments.length === 6 && maybeId && action === "sections") {
    const [,, , sectionId, sectionAction, quizId] = pathSegments;
    if (sectionId && sectionAction === "quizzes" && quizId) {
      return `/admin/courses/${maybeId}/sections/${sectionId}/quizzes/${quizId}`;
    }
  }

  if (resource === "course-offerings" && pathSegments.length === 3 && maybeId && action === "enrollments") {
    return `/admin/course-offerings/${maybeId}/enrollments`;
  }

  if (resource === "course-offerings" && pathSegments.length === 3 && maybeId && action === "assignment-submissions") {
    return `/admin/course-offerings/${maybeId}/assignment-submissions`;
  }

  if (resource === "course-offerings" && pathSegments.length === 5 && maybeId && action === "enrollments") {
    const [, , , enrollmentId, enrollmentAction] = pathSegments;
    if (enrollmentId && enrollmentAction === "certificate") {
      return `/admin/course-offerings/${maybeId}/enrollments/${enrollmentId}/certificate`;
    }
  }

  if (resource === "quizzes" && pathSegments.length === 3 && maybeId && action === "questions") {
    return `/admin/quizzes/${maybeId}/questions`;
  }

  if (resource === "quizzes" && pathSegments.length === 4 && maybeId && action === "questions") {
    const [, , , questionId] = pathSegments;
    if (questionId) {
      return `/admin/quizzes/${maybeId}/questions/${questionId}`;
    }
  }

  if (resource === "questions" && pathSegments.length === 3 && maybeId && action === "options") {
    return `/admin/questions/${maybeId}/options`;
  }

  if (resource === "questions" && pathSegments.length === 4 && maybeId && action === "options") {
    const [, , , optionId] = pathSegments;
    if (optionId) {
      return `/admin/questions/${maybeId}/options/${optionId}`;
    }
  }

  return null;
}

async function proxyAdminRequest(
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
        message: "Admin API path is not allowed",
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

  let body: BodyInit | undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    const contentType = request.headers.get("content-type");
    body = contentType?.startsWith("multipart/form-data")
      ? await request.arrayBuffer()
      : await request.text();

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
  return proxyAdminRequest(request, path);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return proxyAdminRequest(request, path);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return proxyAdminRequest(request, path);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return proxyAdminRequest(request, path);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return proxyAdminRequest(request, path);
}
