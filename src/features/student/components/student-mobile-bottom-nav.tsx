"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getNotifications, notificationQueryKeys } from "@/features/notifications/api/notification-api";
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
  const notificationsQuery = useQuery({
    queryKey: notificationQueryKeys.feed(1, 1),
    queryFn: () => getNotifications({ page: 1, perPage: 1 }),
    staleTime: 30_000,
    refetchInterval: 15_000,
  });

  const unreadNotifications = notificationsQuery.data?.meta.unread_count ?? 0;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--card)] shadow-[0_-10px_28px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
      <div className="grid grid-cols-5 px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5">
        {STUDENT_MOBILE_BOTTOM_NAV.map((item) => {
          const Icon = resolveStudentIcon(item.icon);
          const isActive = isStudentItemActive(pathname, item.href);
          const badgeCount = item.key === "notifications" ? unreadNotifications : 0;

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
                {badgeCount > 0 ? (
                  <span className="absolute -right-2.5 -top-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--danger-soft-foreground)] px-1 text-[9px] font-semibold leading-none text-white">
                    {badgeCount > 99 ? "99+" : badgeCount}
                  </span>
                ) : null}
              </span>
              <span className="max-w-full truncate text-[10px] font-medium leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
