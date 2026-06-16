import { ImageResponse } from "next/og";

interface PwaIconResponseOptions {
  size: number;
  maskable?: boolean;
  logoDataUri?: string | null;
}

function PwaIcon({ size, maskable = false, logoDataUri }: PwaIconResponseOptions) {
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

export function createPwaIconResponse(options: PwaIconResponseOptions) {
  const { size } = options;

  return new ImageResponse(<PwaIcon {...options} />, {
    width: size,
    height: size,
  });
}

export async function getPwaLogoDataUri(): Promise<string | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const settingsRes = await fetch(`${apiUrl.replace(/\/$/, "")}/api/public/website/home`, {
      next: { revalidate: 60 },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!settingsRes.ok) return null;
    const settingsData = await settingsRes.json();
    const logoPath = settingsData?.logo_url || settingsData?.data?.logo_url;
    if (!logoPath) return null;

    const absoluteLogoUrl = logoPath.startsWith("http")
      ? logoPath
      : `${apiUrl.replace(/\/$/, "")}/${logoPath.replace(/^\//, "")}`;

    const logoController = new AbortController();
    const logoTimeoutId = setTimeout(() => logoController.abort(), 3000);

    const logoRes = await fetch(absoluteLogoUrl, {
      signal: logoController.signal,
    });
    clearTimeout(logoTimeoutId);

    if (!logoRes.ok) return null;

    const contentType = logoRes.headers.get("content-type") || "image/png";
    const arrayBuffer = await logoRes.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    return `data:${contentType};base64,${base64}`;
  } catch (err) {
    console.error("Failed to fetch PWA custom logo:", err);
    return null;
  }
}
