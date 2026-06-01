"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { id as indonesianLocale } from "date-fns/locale";
import { ArrowRight, Bell, BookOpenText, Database, ReceiptText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { OverviewMetricCard } from "@/features/admin/components/overview-metric-card";
import { getAdminDashboard } from "@/features/admin/api/master-api";
import { getNotifications, notificationQueryKeys } from "@/features/notifications/api/notification-api";
import type { UserNotification } from "@/types/notification";

function formatRelativeTime(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return formatDistanceToNow(date, {
    addSuffix: true,
    locale: indonesianLocale,
  });
}

function getNotificationHref(notification: UserNotification): string {
  const route = notification.data?.route;
  return typeof route === "string" && route.trim() ? route : "/admin/notifications";
}

export default function AdminPage() {
  const dashboardQuery = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: getAdminDashboard,
    staleTime: 30_000,
  });
  const notificationsQuery = useQuery({
    queryKey: notificationQueryKeys.feed(1, 4),
    queryFn: () => getNotifications({ page: 1, perPage: 4 }),
    staleTime: 30_000,
    refetchInterval: 15_000,
  });

  const metrics = dashboardQuery.data?.metrics ?? [];
  const recentNotifications = notificationsQuery.data?.items ?? [];

  return (
    <section className="space-y-5">
      {dashboardQuery.isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Gagal memuat ringkasan dashboard. Modul admin lain tetap bisa dipakai seperti biasa.
        </div>
      ) : null}

      <AdminPageHeader
        title="Dashboard Admin"
        description="Pantau ringkasan platform dan akses cepat ke modul utama manajemen LMS."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {dashboardQuery.isLoading
          ? Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-32 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface-soft)]"
              />
            ))
          : metrics.map((metric) => (
              <OverviewMetricCard
                key={metric.label}
                label={metric.label}
                value={metric.value}
                note={metric.note}
                delta={metric.delta}
                deltaTone={metric.deltaTone}
              />
            ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm xl:col-span-2">
          <CardHeader className="border-b border-[var(--border)]">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base font-semibold text-[var(--foreground)]">Notifikasi Terbaru</CardTitle>
              <Link href="/admin/notifications" className="text-sm font-semibold text-[var(--primary)] hover:opacity-80">
                Lihat semua
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {notificationsQuery.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-20 animate-pulse rounded-xl bg-[var(--surface-soft)]" />
                ))}
              </div>
            ) : notificationsQuery.isError ? (
              <div className="rounded-xl border border-[var(--danger-soft-border)] bg-[var(--danger-soft-bg)] px-4 py-3 text-sm text-[var(--danger-soft-foreground)]">
                Gagal memuat notifikasi terbaru.
              </div>
            ) : recentNotifications.length > 0 ? (
              <div className="space-y-3">
                {recentNotifications.map((notification) => (
                  <Link
                    key={notification.id}
                    href={getNotificationHref(notification)}
                    className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-4 transition hover:border-[var(--primary)]/25 hover:bg-white"
                  >
                    <span
                      className={[
                        "inline-flex size-10 shrink-0 items-center justify-center rounded-2xl",
                        notification.is_read
                          ? "bg-[var(--card)] text-[var(--muted-foreground)]"
                          : "bg-[var(--primary)] text-[var(--primary-foreground)]",
                      ].join(" ")}
                    >
                      <Bell className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-3">
                        <span className="min-w-0">
                          <span className="block line-clamp-1 text-sm font-semibold text-[var(--foreground)]">
                            {notification.title}
                          </span>
                          <span className="mt-1 block text-xs text-[var(--muted-foreground)]">
                            {notification.actor?.fullname ? `oleh ${notification.actor.fullname}` : "Sistem"}
                          </span>
                        </span>
                        <span className="shrink-0 text-xs text-[var(--muted-foreground)]">
                          {formatRelativeTime(notification.sent_at ?? notification.created_at)}
                        </span>
                      </span>
                      <span className="mt-2 block line-clamp-2 text-sm leading-6 text-[var(--muted-foreground)]">
                        {notification.body}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-soft)] px-4 py-6 text-sm text-[var(--muted-foreground)]">
                Belum ada notifikasi baru. Update operasional untuk admin akan muncul di sini saat ada hal penting yang perlu dipantau.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
            <CardHeader className="space-y-2">
              <div className="inline-flex size-9 items-center justify-center rounded-lg bg-[var(--muted)] text-[var(--primary)]">
                <Database className="size-4" />
              </div>
              <CardTitle className="text-base font-semibold text-[var(--foreground)]">Manajemen Data</CardTitle>
              <p className="text-sm text-[var(--muted-foreground)]">
                Kelola users, categories, courses, dan vouchers dalam satu modul.
              </p>
            </CardHeader>
            <CardContent>
              <Link
                href="/admin/master-data/users"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary)] hover:opacity-80"
              >
                Buka Data Users
                <ArrowRight className="size-4" />
              </Link>
            </CardContent>
          </Card>

          <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
            <CardHeader className="space-y-2">
              <div className="inline-flex size-9 items-center justify-center rounded-lg bg-[var(--muted)] text-[var(--primary)]">
                <ReceiptText className="size-4" />
              </div>
              <CardTitle className="text-base font-semibold text-[var(--foreground)]">Transaksi</CardTitle>
              <p className="text-sm text-[var(--muted-foreground)]">
                Pantau order, pembayaran, dan enrollment dari satu dashboard transaksi.
              </p>
            </CardHeader>
            <CardContent>
              <Link
                href="/admin/transactions"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary)] hover:opacity-80"
              >
                Buka Data Transaksi
                <ArrowRight className="size-4" />
              </Link>
            </CardContent>
          </Card>

          <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
            <CardHeader className="space-y-2">
              <div className="inline-flex size-9 items-center justify-center rounded-lg bg-[var(--muted)] text-[var(--primary)]">
                <BookOpenText className="size-4" />
              </div>
              <CardTitle className="text-base font-semibold text-[var(--foreground)]">Instructor Capability</CardTitle>
              <p className="text-sm text-[var(--muted-foreground)]">
                Area admin juga memuat kebutuhan instructor untuk pengelolaan konten belajar.
              </p>
            </CardHeader>
          </Card>
        </div>
      </div>
    </section>
  );
}

