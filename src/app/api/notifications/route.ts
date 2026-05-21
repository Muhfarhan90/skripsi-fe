import { NextRequest } from "next/server";
import { proxyAuthenticatedApiRequest } from "@/features/auth/lib/server-proxy";

export async function GET(request: NextRequest) {
  return proxyAuthenticatedApiRequest(request, "/notifications");
}
