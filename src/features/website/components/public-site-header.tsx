"use client";

import Link from "next/link";
import { BookOpen, ChevronDown, LayoutDashboard, LogOut, Search } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { BrandLogo } from "@/components/shared/brand-logo";
import { useAuthStore } from "@/features/auth/store/auth-store";
import { useLogoutAction } from "@/features/auth/hooks/use-logout-action";
import { getDefaultPathByRole } from "@/features/auth/lib/roles";
import { PublicThemeLock } from "@/features/website/components/public-theme-lock";
import type { StoreCourse } from "@/types/store";
import type { WebsiteHomeContent } from "@/types/website";

interface PublicSiteHeaderProps {
  settings: Pick<WebsiteHomeContent, "site_name" | "site_tagline" | "logo_url">;
  courses?: StoreCourse[];
  showFeatures?: boolean;
  showFaq?: boolean;
}

function uniqueCourseCategories(courses: StoreCourse[]): string[] {
  return Array.from(
    new Set(
      courses
        .map((course) => course.category_name?.trim())
        .filter((category): category is string => Boolean(category)),
    ),
  ).slice(0, 8);
}

export function PublicSiteHeader({
  settings,
  courses = [],
}: PublicSiteHeaderProps) {
  const user = useAuthStore((state) => state.user);
  const logoutMutation = useLogoutAction();
  const dashboardHref = getDefaultPathByRole(user?.role_id, user?.role_name);
  const initials = user?.fullname?.trim().charAt(0).toUpperCase() || "U";
  const categories = uniqueCourseCategories(courses);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--border)] bg-[var(--card)]/92 backdrop-blur-xl">
      <PublicThemeLock />
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
        <BrandLogo
          href="/"
          title={settings.site_name}
          subtitle={settings.site_tagline || "Platform Belajar"}
          logoUrl={settings.logo_url}
          hideTextOnMobile
          size="sm"
          titleClassName="font-semibold tracking-tight"
        />

        <nav className="hidden items-center gap-1 md:flex">
          <div className="group relative">
            <Link
              href="/courses"
              className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-hover)]"
            >
              Courses
              <ChevronDown className="size-3.5 transition group-hover:rotate-180" />
            </Link>
            <div className="invisible absolute left-0 top-full z-50 w-72 translate-y-2 rounded-3xl border border-[var(--border)] bg-[var(--card)] p-2 opacity-0 shadow-2xl transition group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
              <Link
                href="/courses"
                className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold text-[var(--foreground)] transition hover:bg-[var(--surface-hover)]"
              >
                <span className="inline-flex size-9 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)]">
                  <BookOpen className="size-4" />
                </span>
                Semua Courses
              </Link>
              {categories.length > 0 ? (
                <div className="mt-1 border-t border-[var(--border)] pt-1">
                  {categories.map((category) => (
                    <Link
                      key={category}
                      href={`/courses?category=${encodeURIComponent(category)}`}
                      className="block rounded-2xl px-3 py-2 text-sm font-medium text-[var(--muted-foreground)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
                    >
                      {category}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <Link
            href="/instructors"
            className="rounded-full px-3 py-2 text-sm font-medium text-[var(--muted-foreground)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
          >
            Instructor
          </Link>
        </nav>

        <form
          action="/courses"
          className="hidden min-w-0 flex-1 items-center rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-1.5 transition focus-within:border-[var(--primary)] focus-within:bg-white focus-within:ring-2 focus-within:ring-[var(--primary)]/10 lg:flex"
        >
          <Search className="size-4 shrink-0 text-[var(--muted-foreground)]" />
          <input
            type="search"
            name="search"
            placeholder="Cari course atau instructor"
            className="min-w-0 flex-1 bg-transparent px-3 py-1 text-sm font-medium text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)]"
          />
        </form>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          {user ? (
            <>
              <Link
                href={dashboardHref}
                className="hidden h-9 items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-4 text-xs font-bold text-[var(--foreground)] transition hover:bg-[var(--surface-hover)] active:scale-95 sm:inline-flex"
              >
                <LayoutDashboard className="size-3.5" />
                Dashboard
              </Link>
              <Popover>
                <PopoverTrigger className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-2 py-1.5 transition hover:bg-[var(--surface-hover)]">
                  <span className="inline-flex size-7 items-center justify-center rounded-full bg-[var(--primary)] text-[10px] font-bold text-white">
                    {initials}
                  </span>
                  <span className="hidden max-w-28 truncate text-xs font-semibold text-[var(--foreground)] sm:block">
                    {user.fullname}
                  </span>
                </PopoverTrigger>
                <PopoverContent align="end" sideOffset={8} className="w-56 border border-[var(--border)] bg-[var(--card)] p-2 shadow-xl">
                  <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[var(--muted-foreground)]">
                    Masuk sebagai
                  </p>
                  <p className="truncate px-2 pb-2 text-sm font-semibold text-[var(--foreground)]">
                    {user.email}
                  </p>
                  <Link
                    href={dashboardHref}
                    className="flex items-center gap-2 rounded-xl px-2 py-2 text-sm transition hover:bg-[var(--surface-hover)]"
                  >
                    <LayoutDashboard className="size-4" />
                    Dashboard
                  </Link>
                  <button
                    type="button"
                    onClick={() => logoutMutation.mutate()}
                    disabled={logoutMutation.isPending}
                    className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-sm text-[var(--danger-soft-foreground)] transition hover:bg-[var(--danger-soft-bg)] disabled:opacity-70"
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
                className="inline-flex h-9 items-center rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-4 text-xs font-bold text-[var(--foreground)] transition hover:bg-[var(--surface-hover)] active:scale-95"
              >
                Masuk
              </Link>
              <Link
                href="/register"
                className="inline-flex h-9 items-center rounded-full bg-[var(--primary)] px-4 text-xs font-bold text-white shadow-sm transition hover:opacity-90 active:scale-95"
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
