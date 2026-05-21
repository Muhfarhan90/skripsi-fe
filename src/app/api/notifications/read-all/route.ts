import { NextRequest } from "next/server";
import { proxyAuthenticatedApiRequest } from "@/features/auth/lib/server-proxy";

export async function PATCH(request: NextRequest) {
  return proxyAuthenticatedApiRequest(request, "/notifications/read-all");
}
