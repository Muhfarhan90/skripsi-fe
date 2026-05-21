import { NextRequest } from "next/server";
import { proxyAuthenticatedApiRequest } from "@/features/auth/lib/server-proxy";

interface NotificationRouteContext {
  params: Promise<{
    notificationId: string;
  }>;
}

export async function PATCH(
  request: NextRequest,
  context: NotificationRouteContext,
) {
  const { notificationId } = await context.params;

  return proxyAuthenticatedApiRequest(
    request,
    `/notifications/${notificationId}/read`,
  );
}
