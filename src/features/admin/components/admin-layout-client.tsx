"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { AdminSidebar } from "@/features/admin/components/admin-sidebar";
import { AdminTopbar } from "@/features/admin/components/admin-topbar";
import { cn } from "@/lib/utils/cn";

interface AdminLayoutClientProps {
  fullName: string;
  email: string;
  children: React.ReactNode;
}

export function AdminLayoutClient({ fullName, email, children }: AdminLayoutClientProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const activeTheme = theme === "dark" ? "dark" : "light";

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
    <div className="min-h-screen bg-background text-foreground">
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
          theme={activeTheme}
          isSidebarCollapsed={isDesktopSidebarCollapsed}
          onToggleTheme={() => setTheme(activeTheme === "light" ? "dark" : "light")}
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
