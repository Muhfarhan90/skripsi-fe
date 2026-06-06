"use client";

import Link from "next/link";
import { LayoutDashboard, LogOut } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BrandLogo } from "@/components/shared/brand-logo";
import { useLogoutAction } from "@/features/auth/hooks/use-logout-action";
import { getDefaultPathByRole } from "@/features/auth/lib/roles";
import { useAuthStore } from "@/features/auth/store/auth-store";
import { cn } from "@/lib/utils";
import type { WebsiteHomeContent } from "@/types/website";

interface SiteHeaderProps {
  settings: Pick<WebsiteHomeContent, "site_name" | "site_tagline" | "logo_url">;
  activePath?: "home" | "courses" | "instructors";
}

export function SiteHeader({ settings, activePath = "home" }: SiteHeaderProps) {
  const user = useAuthStore((state) => state.user);
  const logoutMutation = useLogoutAction();
  const dashboardHref = getDefaultPathByRole(user?.role_id, user?.role_name);
  const initials = user?.fullname?.trim().charAt(0).toUpperCase() || "U";

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--card)]/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <BrandLogo
          href="/"
          title={settings.site_name}
          subtitle={settings.site_tagline || "Platform Belajar"}
          logoUrl={settings.logo_url}
          hideTextOnMobile
          size="sm"
        />

        <nav className="hidden items-center gap-1 md:flex">
          <Link
            href="/courses"
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition",
              activePath === "courses"
                ? "text-[var(--primary)]"
                : "text-[var(--muted-foreground)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]",
            )}
          >
            Courses
          </Link>
          <Link
            href="/instructors"
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition",
              activePath === "instructors"
                ? "text-[var(--primary)]"
                : "text-[var(--muted-foreground)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]",
            )}
          >
            Instructor
          </Link>
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          {user ? (
            <>
              <Link
                href={dashboardHref}
                className="hidden h-8 items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-3 text-xs font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-hover)] sm:inline-flex"
              >
                <LayoutDashboard className="size-3.5" />
                Dashboard
              </Link>
              <Popover>
                <PopoverTrigger className="flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-2 py-1.5 transition hover:bg-[var(--surface-hover)]">
                  <span className="inline-flex size-6 items-center justify-center rounded-full bg-[var(--primary)] text-[10px] font-bold text-white">
                    {initials}
                  </span>
                  <span className="hidden max-w-24 truncate text-xs font-medium text-[var(--foreground)] sm:block">
                    {user.fullname}
                  </span>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  sideOffset={8}
                  className="w-52 border border-[var(--border)] bg-[var(--card)] p-2 shadow-lg"
                >
                  <p className="px-2 py-1 text-[10px] font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                    Masuk sebagai
                  </p>
                  <p className="truncate px-2 pb-2 text-sm font-medium text-[var(--foreground)]">{user.email}</p>
                  <Link
                    href={dashboardHref}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition hover:bg-[var(--surface-hover)]"
                  >
                    <LayoutDashboard className="size-4" />
                    Dashboard
                  </Link>
                  <button
                    type="button"
                    onClick={() => logoutMutation.mutate()}
                    disabled={logoutMutation.isPending}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-[var(--danger-soft-foreground)] transition hover:bg-[var(--danger-soft-bg)] disabled:opacity-70"
                  >
                    <LogOut className="size-4" />
                    {logoutMutation.isPending ? "Memproses..." : "Logout"}
                  </button>
                </PopoverContent>
              </Popover>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="inline-flex h-8 items-center rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-3.5 text-xs font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-hover)]"
              >
                Masuk
              </Link>
              <Link
                href="/register"
                className="inline-flex h-8 items-center rounded-md bg-[var(--primary)] px-3.5 text-xs font-semibold text-white shadow-sm transition hover:opacity-90"
              >
                Daftar
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
