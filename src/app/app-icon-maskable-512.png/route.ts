import { createPwaIconResponse } from "@/features/pwa/lib/pwa-icon";

export const dynamic = "force-static";

export function GET() {
  return createPwaIconResponse({ size: 512, maskable: true });
}
