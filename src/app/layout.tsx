import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/providers/app-providers";
import { AuthBootstrap } from "@/features/auth/components/auth-bootstrap";

const poppins = Poppins({
  subsets: ["latin"],
  variable: "--font-poppins",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "LMS Frontend",
  description: "Pre-University LMS frontend",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={poppins.variable}>
      <body className="min-h-screen">
        <AppProviders>
          <AuthBootstrap />
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
