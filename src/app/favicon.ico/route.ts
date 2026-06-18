import { createPwaIconResponse, getPwaLogoDataUri } from "@/features/pwa/lib/pwa-icon";

export const dynamic = "force-dynamic";

export async function GET() {
  const logoDataUri = await getPwaLogoDataUri();
  return createPwaIconResponse({ size: 32, logoDataUri });
}
