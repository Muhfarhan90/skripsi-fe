"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { syncCurrentBrowserFcmDevice } from "@/features/auth/lib/fcm-device-sync";
import { isStudentRole } from "@/features/auth/lib/roles";
import { useAuthStore } from "@/features/auth/store/auth-store";
import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  notificationQueryKeys,
} from "@/features/notifications/api/notification-api";
import { cn } from "@/lib/utils/cn";
import type { UserNotification } from "@/types/notification";

const NOTIFICATION_FETCH_LIMIT = 8;

const notificationDateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function formatNotificationTimestamp(value: string | null): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return notificationDateFormatter.format(date);
}

function getNotificationRoute(notification: UserNotification): string | null {
  const route = notification.data?.route;
  return typeof route === "string" && route.length > 0 ? route : null;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [pendingNotificationId, setPendingNotificationId] = useState<number | null>(null);
  const attemptedInteractiveSyncRef = useRef(false);
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const userId = user?.id ?? null;
  const roleId = user?.role_id ?? null;
  const roleName = user?.role_name ?? null;
  const sessionChecked = useAuthStore((state) => state.sessionChecked);
  const notificationsQuery = useQuery({
    queryKey: notificationQueryKeys.feed(1, NOTIFICATION_FETCH_LIMIT),
    queryFn: () => getNotifications({ page: 1, perPage: NOTIFICATION_FETCH_LIMIT }),
    staleTime: 30_000,
    refetchInterval: 15_000,
  });
  const markAsReadMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: notificationQueryKeys.all });
    },
  });
  const markAllAsReadMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: notificationQueryKeys.all });
    },
  });

  const notifications = notificationsQuery.data?.items ?? [];
  const unreadCount = notificationsQuery.data?.meta.unread_count ?? 0;
  const hasNotifications = notifications.length > 0;
  const isMarkingAllRead = markAllAsReadMutation.isPending;
  const isRefreshing = notificationsQuery.isRefetching && !notificationsQuery.isLoading;
  const markAllLabel = isMarkingAllRead
    ? "Menyimpan..."
    : unreadCount > 0
      ? "Tandai semua"
      : "Sudah dibaca";
  const notificationListHref = isStudentRole(roleName, roleId) ? "/student/notifications" : "/admin/notifications";

  const headerDescription = useMemo(() => {
    if (notificationsQuery.isLoading) {
      return "Memuat notifikasi...";
    }

    if (unreadCount > 0) {
      return `${unreadCount} notifikasi belum dibaca`;
    }

    return hasNotifications ? "Semua notifikasi sudah dibaca" : "Belum ada notifikasi";
  }, [hasNotifications, notificationsQuery.isLoading, unreadCount]);

  const handleSelectNotification = async (notification: UserNotification) => {
    const route = getNotificationRoute(notification);

    if (!notification.is_read) {
      setPendingNotificationId(notification.id);

      try {
        await markAsReadMutation.mutateAsync(notification.id);
      } finally {
        setPendingNotificationId(null);
      }
    }

    setOpen(false);

    if (route) {
      router.push(route);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);

    if (!nextOpen) {
      return;
    }

    void queryClient.invalidateQueries({ queryKey: notificationQueryKeys.all });

    if (!sessionChecked || !userId || attemptedInteractiveSyncRef.current) {
      return;
    }

    attemptedInteractiveSyncRef.current = true;

    void syncCurrentBrowserFcmDevice()
      .then((didSync) => {
        if (!didSync) {
          attemptedInteractiveSyncRef.current = false;
        }
      })
      .catch((error: unknown) => {
        attemptedInteractiveSyncRef.current = false;
        console.error("Failed to sync FCM device token from notification bell", error);
      });
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        className="relative inline-flex size-9 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] transition hover:bg-[var(--surface-hover)]"
        aria-label={
          unreadCount > 0
            ? `Buka notifikasi (${unreadCount} belum dibaca)`
            : "Buka notifikasi"
        }
      >
        <Bell className="size-4" />
        {unreadCount > 0 ? (
          <span className="absolute -top-1 -right-1 inline-flex min-w-4 items-center justify-center rounded-full bg-[var(--danger-soft-foreground)] px-1 text-[10px] font-semibold leading-4 text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-[min(92vw,24rem)] gap-0 overflow-hidden border border-[var(--border)] bg-[var(--card)] p-0 text-[var(--foreground)] shadow-lg"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-3 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Notifikasi</p>
            <p className="text-xs text-[var(--muted-foreground)]">{headerDescription}</p>
          </div>

          <button
            type="button"
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={isMarkingAllRead || unreadCount === 0}
            className={cn(
              "shrink-0 rounded-md px-2 py-1 text-xs font-medium transition",
              isMarkingAllRead || unreadCount === 0
                ? "cursor-not-allowed text-[var(--muted-foreground)] opacity-70"
                : "text-[var(--primary)] hover:bg-[var(--surface-hover)]",
            )}
          >
            {markAllLabel}
          </button>
        </div>

        <div className="max-h-[26rem] overflow-y-auto">
          {notificationsQuery.isLoading ? (
            <div className="px-3 py-6 text-center text-sm text-[var(--muted-foreground)]">
              Memuat notifikasi terbaru...
            </div>
          ) : notificationsQuery.isError ? (
            <div className="space-y-3 px-3 py-6 text-center">
              <p className="text-sm text-[var(--muted-foreground)]">Gagal memuat notifikasi.</p>
              <button
                type="button"
                onClick={() => notificationsQuery.refetch()}
                className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs font-medium transition hover:bg-[var(--surface-hover)]"
              >
                Coba lagi
              </button>
            </div>
          ) : notifications.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-[var(--muted-foreground)]">
              Belum ada notifikasi untuk akun ini.
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {notifications.map((notification) => {
                const isPending = pendingNotificationId === notification.id;

                return (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => void handleSelectNotification(notification)}
                    className={cn(
                      "flex w-full items-start gap-3 px-3 py-3 text-left transition hover:bg-[var(--surface-hover)]",
                      !notification.is_read && "bg-[var(--surface-hover)]/40",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "mt-1.5 inline-flex size-2 shrink-0 rounded-full",
                        notification.is_read ? "bg-[var(--border)]" : "bg-[var(--primary)]",
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-3">
                        <span className="line-clamp-2 text-sm font-semibold text-[var(--foreground)]">
                          {notification.title}
                        </span>
                        <span className="shrink-0 text-[11px] text-[var(--muted-foreground)]">
                          {formatNotificationTimestamp(notification.created_at)}
                        </span>
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-[var(--muted-foreground)]">
                        {notification.body}
                      </span>
                      {isPending ? (
                        <span className="mt-2 block text-[11px] text-[var(--primary)]">
                          Menandai sebagai dibaca...
                        </span>
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {(isRefreshing || markAllAsReadMutation.isPending) && notifications.length > 0 ? (
          <div className="border-t border-[var(--border)] px-3 py-2 text-[11px] text-[var(--muted-foreground)]">
            Menyinkronkan notifikasi...
          </div>
        ) : null}

        <div className="border-t border-[var(--border)] px-3 py-2">
          <Link
            href={notificationListHref}
            onClick={() => setOpen(false)}
            className="inline-flex text-xs font-medium text-[var(--primary)] transition hover:underline"
          >
            Lihat semua notifikasi
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
