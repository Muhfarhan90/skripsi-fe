import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/providers/app-providers";
import { AuthBootstrap } from "@/features/auth/components/auth-bootstrap";
import { PwaBootstrap } from "@/features/pwa/components/pwa-bootstrap";

const poppins = Poppins({
  subsets: ["latin"],
  variable: "--font-poppins",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  applicationName: "UPNVJT Pre-University",
  title: {
    default: "UPNVJT Pre-University",
    template: "%s | UPNVJT Pre-University",
  },
  description: "Platform pembelajaran Pre-University UPN \"Veteran\" Jawa Timur untuk membantu transisi akademik calon mahasiswa.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/app-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/app-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/app-icon-192.png"],
  },
  appleWebApp: {
    capable: true,
    title: "UPNVJT Pre-University",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={poppins.variable} suppressHydrationWarning>
      <body className="min-h-screen">
        <AppProviders>
          <PwaBootstrap />
          <AuthBootstrap />
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
