import { createPwaIconResponse } from "@/features/pwa/lib/pwa-icon";

export const dynamic = "force-dynamic";

export async function GET() {
  return createPwaIconResponse({ size: 192 });
}
