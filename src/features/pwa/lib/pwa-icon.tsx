import { ImageResponse } from "next/og";

interface PwaIconResponseOptions {
  size: number;
  maskable?: boolean;
}

function PwaIcon({ size, maskable = false }: PwaIconResponseOptions) {
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
        background: "#0f4c81",
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
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.22)",
          boxShadow: "0 24px 60px rgba(15,23,42,0.28)",
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
              width: Math.round(size * 0.18),
              height: Math.round(size * 0.18),
              borderRadius: Math.round(size * 0.06),
              background: "rgba(15,23,42,0.34)",
              fontSize: badgeSize,
              fontWeight: 700,
              letterSpacing: Math.round(size * 0.008),
            }}
          >
            PWA
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
            gap: Math.round(size * 0.03),
          }}
        >
          <div
            style={{
              fontSize: headlineSize,
              lineHeight: 1,
              fontWeight: 700,
              letterSpacing: Math.round(size * -0.01),
            }}
          >
            LMS
          </div>
          <div
            style={{
              fontSize: sublineSize,
              lineHeight: 1.35,
              opacity: 0.9,
            }}
          >
            Learn anywhere, even on unstable networks.
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
