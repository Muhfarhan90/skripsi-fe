"use client";

import Link from "next/link";
import { ChevronRight, LayoutDashboard, LogOut, Menu, Moon, PanelLeft, PanelLeftClose, Search, Sun } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useLogoutAction } from "@/features/auth/hooks/use-logout-action";
import { getAdminBreadcrumbs, getAdminPageTitle } from "@/features/admin/data/navigation";
import type { AdminTheme } from "@/features/admin/lib/theme";
import { cn } from "@/lib/utils/cn";

interface AdminTopbarProps {
  fullName: string;
  email: string;
  pathname: string;
  theme: AdminTheme;
  isSidebarCollapsed: boolean;
  onToggleTheme: () => void;
  onToggleSidebar: () => void;
  onOpenMobileSidebar: () => void;
}

export function AdminTopbar({
  fullName,
  email,
  pathname,
  theme,
  isSidebarCollapsed,
  onToggleTheme,
  onToggleSidebar,
  onOpenMobileSidebar,
}: AdminTopbarProps) {
  const logoutMutation = useLogoutAction();
  const breadcrumbs = getAdminBreadcrumbs(pathname);
  const pageTitle = getAdminPageTitle(pathname);
  const formattedDate = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--admin-border)] bg-[var(--admin-topbar-bg)] backdrop-blur">
      <div className="mx-auto flex h-[74px] w-full max-w-[1320px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenMobileSidebar}
            className="inline-flex size-9 items-center justify-center rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface)] text-[var(--admin-foreground)] transition hover:bg-[var(--admin-muted)] lg:hidden"
            aria-label="Buka sidebar"
          >
            <Menu className="size-4" />
          </button>

          <button
            type="button"
            onClick={onToggleSidebar}
            className="hidden size-9 items-center justify-center rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface)] text-[var(--admin-foreground)] transition hover:bg-[var(--admin-muted)] lg:inline-flex"
            aria-label={isSidebarCollapsed ? "Buka sidebar desktop" : "Tutup sidebar desktop"}
          >
            {isSidebarCollapsed ? <PanelLeft className="size-4" /> : <PanelLeftClose className="size-4" />}
          </button>
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-1 text-xs text-[var(--admin-muted-foreground)]">
            {breadcrumbs.map((item, index) => (
              <span key={`${item.label}-${index}`} className="inline-flex items-center gap-1">
                {item.href ? (
                  <Link href={item.href} className="hover:text-[var(--admin-brand)]">
                    {item.label}
                  </Link>
                ) : (
                  <span className="text-[var(--admin-foreground)]">{item.label}</span>
                )}
                {index < breadcrumbs.length - 1 ? <ChevronRight className="size-3" /> : null}
              </span>
            ))}
          </div>
          <p className="truncate text-sm font-semibold text-[var(--admin-foreground)] sm:text-base">{pageTitle}</p>
        </div>

        <div className="hidden flex-1 lg:block">
          <div className="relative ml-auto w-full max-w-md">
            <Search className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-[var(--admin-muted-foreground)]" />
            <Input
              type="search"
              placeholder="Cari menu, data, atau transaksi..."
              className="h-9 border-[var(--admin-border)] bg-[var(--admin-surface)] pl-9 text-[var(--admin-foreground)] placeholder:text-[var(--admin-muted-foreground)]"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleTheme}
          className="inline-flex size-9 items-center justify-center rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface)] text-[var(--admin-foreground)] transition hover:bg-[var(--admin-muted)]"
          aria-label={theme === "light" ? "Aktifkan dark mode" : "Aktifkan light mode"}
        >
          {theme === "light" ? <Moon className="size-4" /> : <Sun className="size-4" />}
        </button>

        <Popover>
          <PopoverTrigger
            className="inline-flex items-center gap-2 rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface)] px-2 py-1.5 text-left transition hover:bg-[var(--admin-muted)]"
            aria-label="Buka menu profil admin"
          >
            <span className="inline-flex size-8 items-center justify-center rounded-md bg-[var(--admin-brand)] text-xs font-semibold text-white">
              {fullName.trim().charAt(0).toUpperCase() || "A"}
            </span>
            <span className="hidden min-w-0 sm:block">
              <span className="block max-w-28 truncate text-xs font-semibold text-[var(--admin-foreground)]">
                {fullName}
              </span>
              <span className="block max-w-28 truncate text-[11px] text-[var(--admin-muted-foreground)]">
                Admin
              </span>
            </span>
          </PopoverTrigger>

          <PopoverContent align="end" className="w-64 border border-[var(--admin-border)] bg-[var(--admin-surface)] p-2 text-[var(--admin-foreground)] shadow-lg">
            <div className="space-y-1 border-b border-[var(--admin-border)] px-2 pb-2">
              <p className="text-sm font-semibold">{fullName}</p>
              <p className="text-xs text-[var(--admin-muted-foreground)]">{email}</p>
              <p className="text-xs text-[var(--admin-muted-foreground)]">{formattedDate}</p>
            </div>

            <div className="space-y-1 pt-2">
              <Link
                href="/admin"
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition hover:bg-[var(--admin-muted)]"
              >
                <LayoutDashboard className="size-4" />
                <span>Dashboard Admin</span>
              </Link>

              <button
                type="button"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition",
                  logoutMutation.isPending
                    ? "cursor-not-allowed opacity-70"
                    : "text-red-600 hover:bg-red-50",
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
