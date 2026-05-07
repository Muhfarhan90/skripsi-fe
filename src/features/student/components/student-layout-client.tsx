"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { useTheme } from "@/providers/theme-provider";
import { StudentSidebar } from "@/features/student/components/student-sidebar";
import { StudentTopbar } from "@/features/student/components/student-topbar";

interface StudentLayoutClientProps {
  fullName: string;
  children: React.ReactNode;
}

export function StudentLayoutClient({ fullName, children }: StudentLayoutClientProps) {
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
      <StudentSidebar
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
        <StudentTopbar
          fullName={fullName}
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
