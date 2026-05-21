"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  PanelLeft,
  PanelLeftClose,
  ShoppingCart,
  Sun,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useLogoutAction } from "@/features/auth/hooks/use-logout-action";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { getStudentCart } from "@/features/student/api/store-api";
import {
  getStudentBreadcrumbs,
  getStudentPageTitle,
} from "@/features/student/data/navigation";
import { cn } from "@/lib/utils/cn";

type DashboardTheme = "light" | "dark";

interface StudentTopbarProps {
  fullName: string;
  pathname: string;
  theme: DashboardTheme;
  isSidebarCollapsed: boolean;
  onToggleTheme: () => void;
  onToggleSidebar: () => void;
  onOpenMobileSidebar: () => void;
}

export function StudentTopbar({
  fullName,
  pathname,
  theme,
  isSidebarCollapsed,
  onToggleTheme,
  onToggleSidebar,
  onOpenMobileSidebar,
}: StudentTopbarProps) {
  const logoutMutation = useLogoutAction();
  const breadcrumbs = getStudentBreadcrumbs(pathname);
  const pageTitle = getStudentPageTitle(pathname);
  const cartQuery = useQuery({
    queryKey: ["student", "cart"],
    queryFn: getStudentCart,
    staleTime: 30_000,
  });
  const cartItemsCount = cartQuery.data?.items.length ?? 0;
  const isCartPage = pathname === "/student/cart" || pathname.startsWith("/student/cart/");
  const formattedDate = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--card)] backdrop-blur">
      <div className="mx-auto flex h-[74px] w-full max-w-[1320px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenMobileSidebar}
            className="inline-flex size-9 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] transition hover:bg-[var(--surface-hover)] lg:hidden"
            aria-label="Buka sidebar"
          >
            <Menu className="size-4" />
          </button>

          <button
            type="button"
            onClick={onToggleSidebar}
            className="hidden size-9 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] transition hover:bg-[var(--surface-hover)] lg:inline-flex"
            aria-label={isSidebarCollapsed ? "Buka sidebar desktop" : "Tutup sidebar desktop"}
          >
            {isSidebarCollapsed ? <PanelLeft className="size-4" /> : <PanelLeftClose className="size-4" />}
          </button>
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
            {breadcrumbs.map((item, index) => (
              <span key={`${item.label}-${index}`} className="inline-flex items-center gap-1">
                {item.href ? (
                  <Link href={item.href} className="hover:text-[var(--primary)]">
                    {item.label}
                  </Link>
                ) : (
                  <span className="text-[var(--foreground)]">{item.label}</span>
                )}
                {index < breadcrumbs.length - 1 ? <ChevronRight className="size-3" /> : null}
              </span>
            ))}
          </div>
          <p className="truncate text-sm font-semibold text-[var(--foreground)] sm:text-base">{pageTitle}</p>
        </div>

        <NotificationBell />

        <Link
          href="/student/cart"
          className={cn(
            "relative inline-flex size-9 items-center justify-center rounded-md border transition",
            isCartPage
              ? "border-[var(--secondary)] bg-[var(--secondary)] text-[var(--secondary-foreground)]"
              : "border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--surface-hover)]",
          )}
          aria-label="Buka cart student"
        >
          <ShoppingCart className="size-4" />
          {cartItemsCount > 0 ? (
            <span className="absolute -right-1.5 -top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--danger-soft-foreground)] px-1 text-[10px] font-semibold leading-none text-white">
              {cartItemsCount > 99 ? "99+" : cartItemsCount}
            </span>
          ) : null}
        </Link>

        <Popover>
          <PopoverTrigger
            className="inline-flex items-center gap-2 rounded-md px-1 py-1 text-left transition hover:bg-[var(--surface-hover)]"
            aria-label="Buka menu profil student"
          >
            <span className="inline-flex size-9 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-semibold text-white">
              {fullName.trim().charAt(0).toUpperCase() || "S"}
            </span>
            <span className="hidden min-w-0 sm:block">
              <span className="block max-w-32 truncate text-sm font-semibold text-[var(--foreground)]">{fullName}</span>
            </span>
            <ChevronDown className="hidden size-4 text-[var(--muted-foreground)] sm:block" />
          </PopoverTrigger>

          <PopoverContent
            align="end"
            className="w-64 border border-[var(--border)] bg-[var(--card)] p-2 text-[var(--foreground)] shadow-lg"
          >
            <div className="space-y-1 border-b border-[var(--border)] px-2 pb-2">
              <p className="text-sm font-semibold">{fullName}</p>
              <p className="text-xs text-[var(--muted-foreground)]">{formattedDate}</p>
            </div>

            <div className="space-y-1 pt-2">
              <button
                type="button"
                onClick={onToggleTheme}
                aria-pressed={theme === "dark"}
                aria-label={theme === "dark" ? "Nonaktifkan dark mode" : "Aktifkan dark mode"}
                className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition hover:bg-[var(--surface-hover)]"
              >
                <span className="inline-flex items-center gap-2">
                  {theme === "light" ? <Moon className="size-4" /> : <Sun className="size-4" />}
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

              <Link
                href="/student"
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition hover:bg-[var(--surface-hover)]"
              >
                <LayoutDashboard className="size-4" />
                <span>Dashboard Student</span>
              </Link>

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
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}
