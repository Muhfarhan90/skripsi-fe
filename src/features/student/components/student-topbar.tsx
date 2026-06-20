"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPublicWebsiteSettings } from "@/features/student/api/store-api";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Award,
  BookOpen,
  ChevronDown,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Moon,
  ReceiptText,
  Sun,
  UserCircle,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BrandLogo, BrandMark } from "@/components/shared/brand-logo";
import { useLogoutAction } from "@/features/auth/hooks/use-logout-action";
import { useAuthStore } from "@/features/auth/store/auth-store";
import { resolvePublicFileUrl } from "@/lib/file-url";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import {
  getStudentMobileBackHref,
  getStudentPageTitle,
  isStudentImmersiveRoute,
  isStudentItemActive,
} from "@/features/student/data/navigation";
import { cn } from "@/lib/utils/cn";

type DashboardTheme = "light" | "dark";
const STUDENT_ROUTE_STACK_KEY = "student.mobile.route-stack";

function readStudentRouteStack(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawValue = window.sessionStorage.getItem(STUDENT_ROUTE_STACK_KEY);
    if (!rawValue) {
      return [];
    }

    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function writeStudentRouteStack(stack: string[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(STUDENT_ROUTE_STACK_KEY, JSON.stringify(stack.slice(-20)));
}

interface StudentTopbarProps {
  fullName: string;
  pathname: string;
  theme: DashboardTheme;
  onToggleTheme: () => void;
}

function getFirstName(fullName: string): string {
  const firstName = fullName.trim().split(/\s+/)[0];
  return firstName || "Student";
}

interface ProfileMenuContentProps {
  fullName: string;
  formattedDate: string;
  theme: DashboardTheme;
  onToggleTheme: () => void;
  logoutMutation: {
    mutate: () => void;
    isPending: boolean;
  };
}

function ProfileMenuContent({
  fullName,
  formattedDate,
  theme,
  onToggleTheme,
  logoutMutation,
}: ProfileMenuContentProps) {
  return (
    <>
      <div className="space-y-1 border-b border-[var(--border)] px-2 pb-2">
        <p className="text-sm font-semibold truncate">{fullName}</p>
        <p className="text-xs text-[var(--muted-foreground)]">{formattedDate}</p>
      </div>

      <div className="space-y-1 pt-2">
        <Link
          href="/student/profile"
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition hover:bg-[var(--surface-hover)]"
        >
          <UserCircle className="size-4 text-[var(--muted-foreground)]" />
          <span>Profil Saya</span>
        </Link>

        <Link
          href="/student/certificates"
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition hover:bg-[var(--surface-hover)]"
        >
          <Award className="size-4 text-[var(--muted-foreground)]" />
          <span>Sertifikat Saya</span>
        </Link>

        <Link
          href="/student/orders"
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition hover:bg-[var(--surface-hover)]"
        >
          <ReceiptText className="size-4 text-[var(--muted-foreground)]" />
          <span>Riwayat Order</span>
        </Link>

        <button
          type="button"
          onClick={onToggleTheme}
          aria-pressed={theme === "dark"}
          aria-label={theme === "dark" ? "Nonaktifkan dark mode" : "Aktifkan dark mode"}
          className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition hover:bg-[var(--surface-hover)]"
        >
          <span className="inline-flex items-center gap-2">
            {theme === "light" ? <Moon className="size-4 text-[var(--muted-foreground)]" /> : <Sun className="size-4 text-[var(--muted-foreground)]" />}
            <span>Dark Mode</span>
          </span>
          <span
            aria-hidden
            className={cn(
              "relative inline-flex h-5 w-9 items-center rounded-full border transition",
              theme === "dark"
                ? "border-emerald-600 bg-emerald-600"
                : "border-[var(--border)] bg-[var(--muted)]",
            )}
          >
            <span
              className={cn(
                "inline-block size-4 rounded-full bg-white transition-transform",
                theme === "dark" ? "translate-x-4" : "translate-x-0.5",
              )}
            />
          </span>
        </button>

        <div className="border-t border-[var(--border)] my-1" />

        <button
          type="button"
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
          className={cn(
            "flex w-full items-center gap-2 rounded-md border border-transparent px-2 py-1.5 text-left text-sm transition",
            logoutMutation.isPending
              ? "cursor-not-allowed opacity-70"
              : "border border-[var(--danger-soft-border)] bg-[var(--danger-soft-bg)] text-[var(--danger-soft-foreground)] hover:opacity-90",
          )}
        >
          <LogOut className="size-4" />
          <span>{logoutMutation.isPending ? "Memproses logout..." : "Logout"}</span>
        </button>
      </div>
    </>
  );
}

export function StudentTopbar({
  fullName,
  pathname,
  theme,
  onToggleTheme,
}: StudentTopbarProps) {
  const logoutMutation = useLogoutAction();
  const user = useAuthStore((state) => state.user);
  const websiteSettingsQuery = useQuery({
    queryKey: ["public", "website-settings"],
    queryFn: getPublicWebsiteSettings,
    staleTime: 5 * 60_000,
  });
  const websiteSettings = websiteSettingsQuery.data;
  const router = useRouter();
  const searchParams = useSearchParams();
  const pageTitle = getStudentPageTitle(pathname);
  const mobileBackHref = getStudentMobileBackHref(pathname);
  const isImmersiveRoute = isStudentImmersiveRoute(pathname);
  const searchQuery = searchParams.toString();
  const currentRoute = searchQuery ? `${pathname}?${searchQuery}` : pathname;
  const formattedDate = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const firstName = getFirstName(fullName);
  const mobileDescription =
    pathname === "/student"
      ? `Selamat datang, ${firstName}`
      : formattedDate;

  useEffect(() => {
    const routeStack = readStudentRouteStack();
    if (routeStack[routeStack.length - 1] === currentRoute) {
      return;
    }

    writeStudentRouteStack([...routeStack, currentRoute]);
  }, [currentRoute]);

  const handleMobileLeadingAction = () => {
    if (!mobileBackHref) return;

    const routeStack = readStudentRouteStack();
    const previousRoute = routeStack.length > 1 ? routeStack[routeStack.length - 2] : null;

    if (previousRoute && previousRoute !== currentRoute) {
      writeStudentRouteStack(routeStack.slice(0, -1));
      router.push(previousRoute);
      return;
    }

    router.push(mobileBackHref);
  };

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--card)]/95 backdrop-blur-xl">
      <div className="mx-auto w-full max-w-[1320px] px-3 sm:px-6 lg:px-8">
        {/* Mobile topbar - compact, single row */}
        <div className="pwa-safe-top flex items-center gap-2 py-2.5 lg:hidden">
          {/* Leading action */}
          {mobileBackHref ? (
            <button
              type="button"
              onClick={handleMobileLeadingAction}
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] text-[var(--foreground)] transition active:scale-95"
              aria-label="Kembali ke halaman sebelumnya"
            >
              <ArrowLeft className="size-4" />
            </button>
          ) : (
            <BrandMark logoUrl={websiteSettings?.logo_url} size="sm" />
          )}

          {/* Title area */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[var(--foreground)] leading-tight">{pageTitle}</p>
            <p className="truncate text-[11px] text-[var(--muted-foreground)] leading-tight">{mobileDescription}</p>
          </div>

          {/* Trailing actions */}
          <div className="flex shrink-0 items-center gap-1.5">
            {isImmersiveRoute ? null : <NotificationBell />}

            {/* Avatar / profile */}
            {pathname !== "/student/profile" ? (
              <Popover>
                <PopoverTrigger
                  className="inline-flex size-9 items-center justify-center rounded-xl transition active:scale-95"
                  aria-label="Buka menu profil student"
                >
                  {user?.avatar ? (
                    <div
                      className="size-9 rounded-xl bg-cover bg-center border border-[var(--border)] bg-[var(--surface-soft)] shadow-inner"
                      style={{ backgroundImage: `url("${resolvePublicFileUrl(user.avatar)}")` }}
                    />
                  ) : (
                    <span className="inline-flex size-9 items-center justify-center rounded-xl bg-[var(--primary)] text-xs font-bold text-white shadow-sm">
                      {fullName.trim().charAt(0).toUpperCase() || "S"}
                    </span>
                  )}
                </PopoverTrigger>

                <PopoverContent
                  align="end"
                  className="w-64 border border-[var(--border)] bg-[var(--card)] p-2 text-[var(--foreground)] shadow-lg"
                >
                  <ProfileMenuContent
                    fullName={fullName}
                    formattedDate={formattedDate}
                    theme={theme}
                    onToggleTheme={onToggleTheme}
                    logoutMutation={logoutMutation}
                  />
                </PopoverContent>
              </Popover>
            ) : null}
          </div>
        </div>

        {/* Desktop topbar */}
        <div className="hidden min-h-[74px] items-center justify-between gap-4 lg:flex">
          {/* Left section: Logo & Nav links */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-3 shrink-0">
              <BrandLogo
                title={websiteSettings?.site_name || "Student Panel"}
                logoUrl={websiteSettings?.logo_url}
                size="md"
              />
            </Link>

            <nav className="flex items-center gap-1.5">
              {[
                { label: "Dashboard", href: "/student", icon: LayoutDashboard, id: "tour-step-dashboard" },
                { label: "Katalog", href: "/student/catalog", icon: BookOpen, id: "tour-step-catalog" },
                { label: "Kelas Saya", href: "/student/enrollments", icon: GraduationCap, id: "tour-step-enrollments" },
              ].map((item) => {
                const Icon = item.icon;
                const isActive = isStudentItemActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    id={item.id}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition duration-200",
                      isActive
                        ? "bg-[var(--primary)] text-white shadow-sm"
                        : "text-[var(--muted-foreground)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
                    )}
                  >
                    <Icon className="size-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right section: Notifications & Profile */}
          <div className="flex shrink-0 items-center gap-3">
            {isImmersiveRoute ? null : <NotificationBell />}

            <Popover>
              <PopoverTrigger
                className="inline-flex items-center gap-2 rounded-xl px-2 py-1 text-left transition hover:bg-[var(--surface-hover)]"
                aria-label="Buka menu profil student"
              >
                {user?.avatar ? (
                  <div
                    className="size-9 rounded-full bg-cover bg-center border border-[var(--border)] bg-[var(--surface-soft)] shadow-inner"
                    style={{ backgroundImage: `url("${resolvePublicFileUrl(user.avatar)}")` }}
                  />
                ) : (
                  <span className="inline-flex size-9 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-semibold text-white shadow-sm">
                    {fullName.trim().charAt(0).toUpperCase() || "S"}
                  </span>
                )}
                <span className="hidden min-w-0 sm:block">
                  <span className="block max-w-32 truncate text-sm font-semibold text-[var(--foreground)]">{fullName}</span>
                </span>
                <ChevronDown className="hidden size-4 text-[var(--muted-foreground)] sm:block" />
              </PopoverTrigger>

              <PopoverContent
                align="end"
                className="w-64 border border-[var(--border)] bg-[var(--card)] p-2 text-[var(--foreground)] shadow-lg"
              >
                <ProfileMenuContent
                  fullName={fullName}
                  formattedDate={formattedDate}
                  theme={theme}
                  onToggleTheme={onToggleTheme}
                  logoutMutation={logoutMutation}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
    </header>
  );
}
