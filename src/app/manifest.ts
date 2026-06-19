import type { MetadataRoute } from "next";
import {
  getPwaWebsiteSettings,
  getVersionedPwaIconPath,
  PWA_ICON_PATHS,
} from "@/features/pwa/lib/pwa-icon";

export const dynamic = "force-dynamic";

const DEFAULT_APP_NAME = "UPNVJT Pre-University";
const DEFAULT_SHORT_NAME = "UPNVJT Pre-Uni";
const DEFAULT_DESCRIPTION =
  'Platform pembelajaran Pre-University UPN "Veteran" Jawa Timur untuk membantu transisi akademik calon mahasiswa.';

function resolveShortName(appName: string): string {
  return appName.length > 18 ? DEFAULT_SHORT_NAME : appName;
}

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await getPwaWebsiteSettings();
  const appName = settings?.siteName?.trim() || DEFAULT_APP_NAME;
  const shortName = resolveShortName(appName);
  const description = settings?.siteTagline?.trim() || DEFAULT_DESCRIPTION;
  const icon192 = getVersionedPwaIconPath(PWA_ICON_PATHS.icon192, settings);
  const icon512 = getVersionedPwaIconPath(PWA_ICON_PATHS.icon512, settings);
  const maskable192 = getVersionedPwaIconPath(PWA_ICON_PATHS.maskable192, settings);
  const maskable512 = getVersionedPwaIconPath(PWA_ICON_PATHS.maskable512, settings);

  return {
    id: "/",
    name: appName,
    short_name: shortName,
    description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f8fafc",
    theme_color: "#0f172a",
    lang: "id-ID",
    categories: ["education", "productivity"],
    icons: [
      {
        src: icon192,
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: icon512,
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: maskable192,
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: maskable512,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Masuk",
        short_name: "Masuk",
        description: "Buka halaman login",
        url: "/login",
        icons: [{ src: icon192, sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Katalog Kursus",
        short_name: "Kursus",
        description: "Jelajahi katalog kursus",
        url: "/courses",
        icons: [{ src: icon192, sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
