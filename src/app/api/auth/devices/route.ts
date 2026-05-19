import { NextRequest } from "next/server";
import { proxyAuthenticatedApiRequest } from "@/features/auth/lib/server-proxy";

export async function POST(request: NextRequest) {
  return proxyAuthenticatedApiRequest(request, "/auth/devices");
}
