"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import {
  ADMIN_NAVIGATION,
  isAdminItemActive,
  resolveAdminIcon,
} from "@/features/admin/data/navigation";

interface AdminSidebarProps {
  pathname: string;
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

interface SidebarMenuProps {
  pathname: string;
  collapsed: boolean;
  isMobile: boolean;
  onNavigate?: () => void;
}

function SidebarMenu({ pathname, collapsed, isMobile, onNavigate }: SidebarMenuProps) {
  return (
    <div className="flex h-full flex-col">
      <header className={cn("flex h-[74px] items-center border-b border-[var(--border)]", collapsed ? "justify-center px-2" : "justify-between px-4")}>
        <Link
          href="/admin"
          onClick={onNavigate}
          className={cn("flex items-center gap-3", collapsed && !isMobile ? "justify-center" : "justify-start")}
          title={collapsed && !isMobile ? "Dashboard Admin" : undefined}
        >
          <span className="inline-flex size-9 items-center justify-center rounded-lg bg-[var(--secondary)] text-sm font-bold text-[var(--secondary-foreground)] shadow-sm">
            LMS
          </span>
          {collapsed && !isMobile ? null : (
            <span className="space-y-0.5">
              <span className="block text-sm font-semibold text-[var(--primary-foreground)]">Admin Panel</span>
              <span className="block text-xs text-[var(--primary-foreground)]">Skripsi LMS</span>
            </span>
          )}
        </Link>

        {isMobile ? (
          <button
            type="button"
            onClick={onNavigate}
            className="inline-flex size-9 items-center justify-center rounded-md text-[var(--primary-foreground)] transition hover:bg-[var(--sidebar-hover)]"
            aria-label="Tutup sidebar"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </header>

      <div className="flex-1 overflow-y-auto px-3 py-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {ADMIN_NAVIGATION.map((group) => (
          <section key={group.key} className="mb-5">
            {collapsed && !isMobile ? (
              <div className="my-3 border-t border-[var(--border)]" />
            ) : (
              <p className="mb-2 px-2 text-[11px] font-semibold tracking-[0.08em] text-[var(--primary-foreground)] uppercase">
                {group.title}
              </p>
            )}

            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = resolveAdminIcon(item.icon);
                const isActive = isAdminItemActive(pathname, item.href);

                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={isActive ? "page" : undefined}
                    title={collapsed && !isMobile ? item.label : undefined}
                    className={cn(
                      "group relative flex items-center rounded-lg transition",
                      collapsed && !isMobile ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5",
                      isActive
                        ? "bg-[var(--secondary)] text-[var(--secondary-foreground)] shadow-sm"
                        : "text-[var(--primary-foreground)] hover:bg-[var(--sidebar-hover)]",
                    )}
                  >
                    <Icon className={cn("shrink-0", collapsed && !isMobile ? "size-5" : "size-4")} />

                    {collapsed && !isMobile ? null : (
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{item.label}</span>
                        <span
                          className={cn(
                            "block truncate text-xs",
                            isActive
                              ? "text-[var(--secondary-foreground)] opacity-80"
                              : "text-[var(--sidebar-muted-foreground)] group-hover:text-[var(--primary-foreground)]",
                          )}
                        >
                          {item.description}
                        </span>
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

export function AdminSidebar({
  pathname,
  collapsed,
  mobileOpen,
  onCloseMobile,
}: AdminSidebarProps) {
  return (
    <>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden border-r border-[var(--border)] bg-[var(--primary)] text-[var(--primary-foreground)] transition-all duration-300 lg:block",
          collapsed ? "w-[92px]" : "w-[280px]",
        )}
      >
        <SidebarMenu pathname={pathname} collapsed={collapsed} isMobile={false} />
      </aside>

      <div
        className={cn(
          "fixed inset-0 z-50 bg-zinc-950/40 backdrop-blur-[1px] transition-opacity lg:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onCloseMobile}
        aria-hidden
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-[60] w-[280px] border-r border-[var(--border)] bg-[var(--primary)] text-[var(--primary-foreground)] transition-transform duration-300 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <SidebarMenu
          pathname={pathname}
          collapsed={false}
          isMobile
          onNavigate={onCloseMobile}
        />
      </aside>
    </>
  );
}

