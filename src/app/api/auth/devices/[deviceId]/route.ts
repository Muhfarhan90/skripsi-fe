import { NextRequest } from "next/server";
import { proxyAuthenticatedApiRequest } from "@/features/auth/lib/server-proxy";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ deviceId: string }> },
) {
  const { deviceId } = await context.params;

  return proxyAuthenticatedApiRequest(
    request,
    `/auth/devices/${encodeURIComponent(deviceId)}`,
  );
}
