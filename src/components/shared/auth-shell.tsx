"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils/cn";
import { BrandLogo } from "@/components/shared/brand-logo";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PublicSiteHeader } from "@/features/website/components/public-site-header";
import { SiteFooter } from "@/features/website/components/site-footer";
import { createDefaultWebsiteSetting } from "@/features/website/lib/website-settings";
import { getPublicWebsiteSettings, getPublishedCourses } from "@/features/student/api/store-api";

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footerText?: string;
  footerLinkText?: string;
  footerHref?: string;
  className?: string;
}

const defaultWebsiteSettings = createDefaultWebsiteSetting();

export function AuthShell({
  title,
  subtitle,
  children,
  footerText,
  footerLinkText,
  footerHref,
  className,
}: AuthShellProps) {
  const websiteSettingsQuery = useQuery({
    queryKey: ["public", "website-settings"],
    queryFn: getPublicWebsiteSettings,
    staleTime: 5 * 60_000,
  });
  const courseQuery = useQuery({
    queryKey: ["store", "courses", "nav"],
    queryFn: getPublishedCourses,
    staleTime: 5 * 60_000,
  });

  const websiteSettings = websiteSettingsQuery.data ?? defaultWebsiteSettings;

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <PublicSiteHeader settings={websiteSettings} courses={courseQuery.data ?? []} />

      <main className="relative flex min-h-[calc(100vh-5rem)] items-center justify-center overflow-hidden px-4 py-8 sm:px-6 sm:py-12">
        <section className={cn("relative mx-auto w-full max-w-md", className)}>
          <Card className="w-full overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--card)]/95 shadow-2xl shadow-slate-900/10 backdrop-blur">
            <CardHeader className="space-y-3 px-5 pt-6 sm:px-8 sm:pt-8">
              <BrandLogo
                title={websiteSettings.site_name}
                subtitle={websiteSettings.site_tagline || "Platform Belajar"}
                logoUrl={websiteSettings.logo_url}
                size="sm"
              />
              <div>
                <CardTitle className="text-2xl font-black tracking-tight text-[var(--foreground)] sm:text-3xl">
                  {title}
                </CardTitle>
                <CardDescription className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                  {subtitle}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-6 sm:px-8 sm:pb-8">
              {children}

              {footerText && footerLinkText && footerHref ? (
                <p className="mt-6 rounded-2xl bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--muted-foreground)]">
                  {footerText}{" "}
                  <Link href={footerHref} className="font-black text-[var(--primary)] hover:underline">
                    {footerLinkText}
                  </Link>
                </p>
              ) : null}
            </CardContent>
          </Card>
        </section>
      </main>

      <SiteFooter settings={websiteSettings} />
    </div>
  );
}
