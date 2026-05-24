import { createPwaIconResponse } from "@/features/pwa/lib/pwa-icon";

export const runtime = "edge";

export function GET() {
  return createPwaIconResponse({ size: 512, maskable: true });
}
