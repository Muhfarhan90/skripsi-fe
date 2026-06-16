"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useTheme } from "@/providers/theme-provider";
import { StudentMobileBottomNav } from "@/features/student/components/student-mobile-bottom-nav";
import { StudentTopbar } from "@/features/student/components/student-topbar";
import {
  getStudentBreadcrumbs,
  getStudentPageTitle,
  isStudentImmersiveRoute,
} from "@/features/student/data/navigation";

interface StudentLayoutClientProps {
  fullName: string;
  children: React.ReactNode;
}

export function StudentLayoutClient({ fullName, children }: StudentLayoutClientProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const activeTheme = theme === "dark" ? "dark" : "light";
  const isImmersiveRoute = isStudentImmersiveRoute(pathname);
  const breadcrumbs = getStudentBreadcrumbs(pathname);
  const pageTitle = getStudentPageTitle(pathname);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="flex min-h-dvh flex-col bg-[var(--surface-soft)]">
        <StudentTopbar
          fullName={fullName}
          pathname={pathname}
          theme={activeTheme}
          onToggleTheme={() => setTheme(activeTheme === "light" ? "dark" : "light")}
        />

        <main
          className={cn(
            "flex-1 px-3 py-3 sm:px-6 sm:py-5 lg:px-8",
            isImmersiveRoute ? "pwa-safe-bottom" : "pwa-safe-bottom-floating-nav",
          )}
        >
          <div className="mx-auto w-full max-w-[1320px]">
            {/* Desktop Breadcrumbs & Page Title */}
            {!isImmersiveRoute && (
              <div className="mb-5 hidden lg:block">
                <div className="mb-1 flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
                  {breadcrumbs.map((item, index) => (
                    <span key={`${item.label}-${index}`} className="inline-flex items-center gap-1">
                      {item.href ? (
                        <Link href={item.href} className="hover:text-[var(--primary)] transition-colors">
                          {item.label}
                        </Link>
                      ) : (
                        <span className="text-[var(--foreground)]">{item.label}</span>
                      )}
                      {index < breadcrumbs.length - 1 ? <ChevronRight className="size-3" /> : null}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {children}
          </div>
        </main>

        {isImmersiveRoute ? null : <StudentMobileBottomNav pathname={pathname} />}
      </div>
    </div>
  );
}
