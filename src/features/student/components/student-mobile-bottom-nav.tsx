"use client";

import Link from "next/link";
import {
  isStudentItemActive,
  resolveStudentIcon,
  STUDENT_MOBILE_BOTTOM_NAV,
} from "@/features/student/data/navigation";
import { cn } from "@/lib/utils/cn";

interface StudentMobileBottomNavProps {
  pathname: string;
}

export function StudentMobileBottomNav({ pathname }: StudentMobileBottomNavProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--card)] shadow-[0_-10px_28px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
      <div className="grid grid-cols-3 px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5">
        {STUDENT_MOBILE_BOTTOM_NAV.map((item) => {
          const Icon = resolveStudentIcon(item.icon);
          const isActive = isStudentItemActive(pathname, item.href);

          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-md px-1 text-center transition",
                isActive
                  ? "text-[var(--primary)]"
                  : "text-[var(--muted-foreground)] active:bg-[var(--surface-hover)]",
              )}
            >
              {isActive ? (
                <span className="absolute top-0 h-0.5 w-7 rounded-full bg-[var(--primary)]" aria-hidden />
              ) : null}
              <span className="relative inline-flex">
                <Icon className={cn("size-5", isActive && "stroke-[2.4]")} />
              </span>
              <span className="max-w-full truncate text-[10px] font-medium leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
