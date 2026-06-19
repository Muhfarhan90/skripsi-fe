import { ImageResponse } from "next/og";

interface PwaIconResponseOptions {
  size: number;
  maskable?: boolean;
  logoDataUri?: string | null;
}

export interface PwaWebsiteSettings {
  siteName: string | null;
  siteTagline: string | null;
  logoUrl: string | null;
  updatedAt: string | null;
}

interface WebsiteSettingsEnvelope {
  data?: {
    site_name?: string | null;
    site_tagline?: string | null;
    logo_url?: string | null;
    updated_at?: string | null;
  };
  site_name?: string | null;
  site_tagline?: string | null;
  logo_url?: string | null;
  updated_at?: string | null;
}

interface FetchedPwaLogo {
  arrayBuffer: ArrayBuffer;
  contentType: string;
}

export const PWA_ICON_PATHS = {
  favicon: "/favicon.ico",
  icon192: "/app-icon-192.png",
  icon512: "/app-icon-512.png",
  maskable192: "/app-icon-maskable-192.png",
  maskable512: "/app-icon-maskable-512.png",
  appleTouch: "/apple-touch-icon.png",
} as const;

const ICON_CACHE_CONTROL = "no-store, no-cache, must-revalidate";

function PwaIcon({ size, maskable = false, logoDataUri }: PwaIconResponseOptions) {
  if (logoDataUri) {
    const safeZone = maskable ? Math.round(size * 0.74) : size;
    const inset = Math.round((size - safeZone) / 2);

    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
        }}
      >
        <img
          src={logoDataUri}
          alt="Logo"
          style={{
            width: safeZone,
            height: safeZone,
            margin: inset,
            objectFit: "contain",
          }}
        />
      </div>
    );
  }

  const safeZone = maskable ? Math.round(size * 0.74) : size;
  const inset = Math.round((size - safeZone) / 2);
  const headlineSize = Math.max(32, Math.round(size * 0.2));
  const sublineSize = Math.max(12, Math.round(size * 0.075));
  const badgeSize = Math.max(10, Math.round(size * 0.04));

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0f5132 0%, #15803d 100%)",
        color: "#f8fafc",
        fontFamily: "Poppins, Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: safeZone,
          height: safeZone,
          margin: inset,
          borderRadius: Math.round(size * 0.22),
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: Math.round(size * 0.11),
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(250, 204, 21, 0.25)",
          boxShadow: "0 24px 60px rgba(15,23,42,0.35)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: Math.round(size * 0.22),
              height: Math.round(size * 0.18),
              borderRadius: Math.round(size * 0.06),
              background: "rgba(250, 204, 21, 0.15)",
              color: "#facc15",
              fontSize: badgeSize,
              fontWeight: 700,
              letterSpacing: Math.round(size * 0.008),
            }}
          >
            PRE-U
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: Math.max(4, Math.round(size * 0.012)),
            }}
          >
            <div
              style={{
                width: Math.round(size * 0.028),
                height: Math.round(size * 0.028),
                borderRadius: 999,
                background: "#22c55e",
              }}
            />
            <div
              style={{
                width: Math.round(size * 0.028),
                height: Math.round(size * 0.028),
                borderRadius: 999,
                background: "#facc15",
              }}
            />
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: Math.round(size * 0.02),
          }}
        >
          {logoDataUri ? (
            <img
              src={logoDataUri}
              alt="Logo"
              style={{
                width: Math.round(size * 0.35),
                height: Math.round(size * 0.35),
                objectFit: "contain",
                marginBottom: Math.round(size * 0.02),
              }}
            />
          ) : (
            <div
              style={{
                fontSize: headlineSize,
                lineHeight: 1,
                fontWeight: 700,
                letterSpacing: Math.round(size * -0.01),
                color: "#ffffff",
              }}
            >
              UPNVJT
            </div>
          )}
          <div
            style={{
              fontSize: sublineSize,
              lineHeight: 1.35,
              fontWeight: 500,
              color: "#facc15",
            }}
          >
            Pre-University
          </div>
        </div>
      </div>
    </div>
  );
}

function createGeneratedPwaIconResponse(options: PwaIconResponseOptions) {
  const { size } = options;

  return new ImageResponse(<PwaIcon {...options} />, {
    width: size,
    height: size,
    headers: {
      "Cache-Control": ICON_CACHE_CONTROL,
    },
  });
}

export async function createPwaIconResponse(options: PwaIconResponseOptions): Promise<Response> {
  const customLogoResponse = await createPwaLogoPngResponse(options);

  if (customLogoResponse) {
    return customLogoResponse;
  }

  return createGeneratedPwaIconResponse(options);
}

function getServerApiBaseUrl(): string | null {
  const apiUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL;
  const normalized = apiUrl?.trim().replace(/\/$/, "");

  if (!normalized) {
    return null;
  }

  if (normalized.endsWith("/api")) {
    return normalized;
  }

  return `${normalized}/api`;
}

function createVersionedPath(path: string, version: string | null | undefined): string {
  const normalizedVersion = version?.trim();

  if (!normalizedVersion) {
    return path;
  }

  const params = new URLSearchParams({ v: normalizedVersion });
  return `${path}?${params.toString()}`;
}

export function getPwaAssetVersion(settings: PwaWebsiteSettings | null | undefined): string | null {
  return settings?.updatedAt || settings?.logoUrl || null;
}

export function getVersionedPwaIconPath(
  path: string,
  settings: PwaWebsiteSettings | null | undefined,
): string {
  return createVersionedPath(path, getPwaAssetVersion(settings));
}

function mapSettingsPayload(payload: WebsiteSettingsEnvelope | null): PwaWebsiteSettings | null {
  const settings = payload?.data ?? payload;

  if (!settings) {
    return null;
  }

  return {
    siteName: settings.site_name ?? null,
    siteTagline: settings.site_tagline ?? null,
    logoUrl: settings.logo_url ?? null,
    updatedAt: settings.updated_at ?? null,
  };
}

function resolveLogoUrl(logoPath: string, apiBaseUrl: string): string | null {
  const normalized = logoPath.trim();

  if (!normalized) {
    return null;
  }

  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    return normalized;
  }

  let resolvedPath = normalized;
  if (normalized.startsWith("/storage/")) {
    resolvedPath = normalized;
  } else if (normalized.startsWith("storage/")) {
    resolvedPath = `/${normalized}`;
  } else if (!normalized.includes("/") && !normalized.includes("\\")) {
    return null;
  } else {
    resolvedPath = `/storage/${normalized.replace(/^[\\/]+/, "").replace(/\\/g, "/")}`;
  }

  return `${new URL(apiBaseUrl).origin}${resolvedPath}`;
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function getPwaWebsiteSettings(): Promise<PwaWebsiteSettings | null> {
  const apiBaseUrl = getServerApiBaseUrl();
  if (!apiBaseUrl) return null;

  try {
    const settingsRes = await fetchWithTimeout(`${apiBaseUrl}/website/home`, 2000);

    if (!settingsRes.ok) {
      return null;
    }

    const settingsData = (await settingsRes.json()) as WebsiteSettingsEnvelope;
    return mapSettingsPayload(settingsData);
  } catch (err) {
    console.error("Failed to fetch PWA website settings:", err);
    return null;
  }
}

async function fetchPwaLogo(): Promise<FetchedPwaLogo | null> {
  const apiBaseUrl = getServerApiBaseUrl();
  if (!apiBaseUrl) return null;

  try {
    const settings = await getPwaWebsiteSettings();
    const absoluteLogoUrl = settings?.logoUrl
      ? resolveLogoUrl(settings.logoUrl, apiBaseUrl)
      : null;

    if (!absoluteLogoUrl) return null;

    const logoRes = await fetchWithTimeout(absoluteLogoUrl, 3000);

    if (!logoRes.ok) return null;

    const contentType = logoRes.headers.get("content-type") || "image/png";
    const arrayBuffer = await logoRes.arrayBuffer();

    return {
      arrayBuffer,
      contentType,
    };
  } catch (err) {
    console.error("Failed to fetch PWA custom logo:", err);
    return null;
  }
}

async function createPwaLogoPngResponse(options: PwaIconResponseOptions): Promise<Response | null> {
  const logo = await fetchPwaLogo();

  if (!logo) {
    return null;
  }

  try {
    const sharp = (await import("sharp")).default;
    const { size, maskable = false } = options;
    const safeZone = maskable ? Math.round(size * 0.74) : size;
    const inset = Math.round((size - safeZone) / 2);
    const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
    const resizedLogo = await sharp(Buffer.from(logo.arrayBuffer), { animated: false })
      .resize({
        width: safeZone,
        height: safeZone,
        fit: "contain",
        background: transparent,
      })
      .png()
      .toBuffer();
    const icon = await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: transparent,
      },
    })
      .composite([{ input: resizedLogo, left: inset, top: inset }])
      .png()
      .toBuffer();

    return new Response(new Uint8Array(icon), {
      headers: {
        "Cache-Control": ICON_CACHE_CONTROL,
        "Content-Type": "image/png",
      },
    });
  } catch (err) {
    console.error("Failed to render PWA custom logo:", err);
    return null;
  }
}

export async function getPwaLogoDataUri(): Promise<string | null> {
  const logo = await fetchPwaLogo();

  if (!logo) {
    return null;
  }

  const base64 = Buffer.from(logo.arrayBuffer).toString("base64");
  return `data:${logo.contentType};base64,${base64}`;
}
