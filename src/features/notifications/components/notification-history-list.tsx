"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCheck, ChevronRight, Inbox } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminPagination } from "@/features/admin/components/admin-pagination";
import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  notificationQueryKeys,
} from "@/features/notifications/api/notification-api";
import { cn } from "@/lib/utils/cn";
import type { NotificationListMeta, UserNotification } from "@/types/notification";

const HISTORY_PAGE_SIZE = 15;

const notificationDateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatNotificationTimestamp(value: string | null): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return notificationDateFormatter.format(date);
}

function getNotificationRoute(notification: UserNotification): string | null {
  const route = notification.data?.route;
  return typeof route === "string" && route.length > 0 ? route : null;
}

function createFallbackMeta(page: number): NotificationListMeta {
  return {
    current_page: page,
    last_page: 1,
    per_page: HISTORY_PAGE_SIZE,
    total: 0,
    unread_count: 0,
  };
}

interface NotificationHistoryListProps {
  emptyHref: string;
  emptyLabel: string;
}

export function NotificationHistoryList({
  emptyHref,
  emptyLabel,
}: NotificationHistoryListProps) {
  const [page, setPage] = useState(1);
  const [pendingNotificationId, setPendingNotificationId] = useState<number | null>(null);
  const router = useRouter();
  const queryClient = useQueryClient();
  const notificationsQuery = useQuery({
    queryKey: notificationQueryKeys.history(page, HISTORY_PAGE_SIZE),
    queryFn: () => getNotifications({ page, perPage: HISTORY_PAGE_SIZE }),
    staleTime: 30_000,
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
  const meta = notificationsQuery.data?.meta ?? createFallbackMeta(page);
  const hasNotifications = notifications.length > 0;

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

    if (route) {
      router.push(route);
    }
  };

  return (
    <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
      <CardHeader className="border-b border-[var(--border)] pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold text-[var(--foreground)]">
              Riwayat Notifikasi
            </CardTitle>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              {meta.unread_count > 0
                ? `${meta.unread_count} notifikasi belum dibaca.`
                : "Semua notifikasi sudah dibaca."}
            </p>
          </div>

          <button
            type="button"
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={markAllAsReadMutation.isPending || meta.unread_count === 0}
            className={cn(
              "inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium transition",
              markAllAsReadMutation.isPending || meta.unread_count === 0
                ? "cursor-not-allowed border-[var(--border)] text-[var(--muted-foreground)] opacity-70"
                : "border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-hover)]",
            )}
          >
            <CheckCheck className="size-4" />
            <span>{markAllAsReadMutation.isPending ? "Menyimpan..." : "Tandai semua dibaca"}</span>
          </button>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {notificationsQuery.isLoading ? (
          <p className="text-sm text-[var(--muted-foreground)]">Memuat notifikasi...</p>
        ) : null}

        {notificationsQuery.isError ? (
          <p className="text-sm text-[var(--danger-soft-foreground)]">Gagal memuat notifikasi.</p>
        ) : null}

        {notificationsQuery.isSuccess && !hasNotifications ? (
          <div className="rounded-lg border border-dashed border-[var(--border)] px-5 py-10 text-center">
            <Inbox className="mx-auto size-10 text-[var(--muted-foreground)]" />
            <p className="mt-3 text-sm font-medium text-[var(--foreground)]">Belum ada notifikasi</p>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Notifikasi baru akan muncul di sini saat ada aktivitas penting.
            </p>
            <button
              type="button"
              onClick={() => router.push(emptyHref)}
              className="mt-4 inline-flex h-9 items-center rounded-md border border-[var(--border)] px-3 text-sm text-[var(--foreground)] transition hover:bg-[var(--surface-hover)]"
            >
              {emptyLabel}
            </button>
          </div>
        ) : null}

        {hasNotifications ? (
          <div className="space-y-3">
            {notifications.map((notification) => {
              const route = getNotificationRoute(notification);
              const isPending = pendingNotificationId === notification.id;

              return (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => void handleSelectNotification(notification)}
                  className={cn(
                    "flex w-full items-start gap-4 rounded-lg border px-4 py-4 text-left transition hover:bg-[var(--surface-hover)]",
                    notification.is_read
                      ? "border-[var(--border)] bg-[var(--card)]"
                      : "border-[var(--primary)]/20 bg-[var(--surface-hover)]/40",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "mt-1.5 inline-flex size-2.5 shrink-0 rounded-full",
                      notification.is_read ? "bg-[var(--border)]" : "bg-[var(--primary)]",
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-start justify-between gap-3">
                      <span>
                        <span className="block text-sm font-semibold text-[var(--foreground)]">
                          {notification.title}
                        </span>
                        <span className="mt-1 block text-xs text-[var(--muted-foreground)]">
                          {formatNotificationTimestamp(notification.created_at)}
                          {notification.actor?.fullname ? ` | oleh ${notification.actor.fullname}` : ""}
                        </span>
                      </span>
                      {route ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--primary)]">
                          <span>Buka</span>
                          <ChevronRight className="size-3" />
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-2 block text-sm leading-6 text-[var(--muted-foreground)]">
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
        ) : null}
      </CardContent>

      {meta.total > 0 ? (
        <AdminPagination
          meta={meta}
          isLoading={notificationsQuery.isLoading}
          onPageChange={setPage}
        />
      ) : null}
    </Card>
  );
}
