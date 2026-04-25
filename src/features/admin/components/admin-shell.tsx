"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AdminSidebar } from "@/features/admin/components/admin-sidebar";
import { AdminTopbar } from "@/features/admin/components/admin-topbar";
import {
  ADMIN_THEME_STORAGE_KEY,
  DEFAULT_ADMIN_THEME,
  isAdminTheme,
  type AdminTheme,
} from "@/features/admin/lib/theme";
import { cn } from "@/lib/utils/cn";

interface AdminShellProps {
  fullName: string;
  email: string;
  children: React.ReactNode;
}

export function AdminShell({ fullName, email, children }: AdminShellProps) {
  const pathname = usePathname();
  const [theme, setTheme] = useState<AdminTheme>(() => {
    if (typeof window === "undefined") {
      return DEFAULT_ADMIN_THEME;
    }

    const storedTheme = window.localStorage.getItem(ADMIN_THEME_STORAGE_KEY);
    return isAdminTheme(storedTheme) ? storedTheme : DEFAULT_ADMIN_THEME;
  });
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    window.localStorage.setItem(ADMIN_THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (!isMobileSidebarOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMobileSidebarOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isMobileSidebarOpen]);

  useEffect(() => {
    if (!isMobileSidebarOpen) {
      return;
    }

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = overflow;
    };
  }, [isMobileSidebarOpen]);

  return (
    <div
      className="admin-shell min-h-screen bg-[var(--admin-bg)] text-[var(--admin-foreground)]"
      data-admin-theme={theme}
    >
      <AdminSidebar
        pathname={pathname}
        collapsed={isDesktopSidebarCollapsed}
        mobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      <div
        className={cn(
          "flex min-h-screen flex-col transition-[padding] duration-300",
          isDesktopSidebarCollapsed ? "lg:pl-[92px]" : "lg:pl-[280px]",
        )}
      >
        <AdminTopbar
          fullName={fullName}
          email={email}
          pathname={pathname}
          theme={theme}
          isSidebarCollapsed={isDesktopSidebarCollapsed}
          onToggleTheme={() => setTheme((prev) => (prev === "light" ? "dark" : "light"))}
          onToggleSidebar={() => setIsDesktopSidebarCollapsed((prev) => !prev)}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
        />

        <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1320px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
