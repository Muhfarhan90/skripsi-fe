"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { id as indonesianLocale } from "date-fns/locale";
import {
  ArrowRight,
  Bell,
  BookOpenText,
  ClipboardCheck,
  Database,
  MessageSquareText,
  ReceiptText,
  Star,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { OverviewMetricCard } from "@/features/admin/components/overview-metric-card";
import { getAdminDashboard, type AdminDashboard, type InstructorDashboardOverview } from "@/features/admin/api/master-api";
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
  const isInstructorDashboard = dashboardQuery.data?.context === "instructor";
  const instructorOverview = dashboardQuery.data?.instructor_overview ?? null;

  return (
    <section className="space-y-5">
      {dashboardQuery.isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Gagal memuat ringkasan dashboard. Modul admin lain tetap bisa dipakai seperti biasa.
        </div>
      ) : null}

      <AdminPageHeader
        title={isInstructorDashboard ? "Dashboard Instructor" : "Dashboard"}
        description={
          isInstructorDashboard
            ? "Pantau performa course yang Anda ajar, aktivitas siswa, dan pekerjaan review yang perlu ditindaklanjuti."
            : "Pantau ringkasan platform, aktivitas course, dan akses cepat ke modul utama LMS."
        }
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

      {isInstructorDashboard ? (
        <InstructorDashboardPanels
          isLoading={dashboardQuery.isLoading}
          notificationsQuery={notificationsQuery}
          recentNotifications={recentNotifications}
          overview={instructorOverview}
        />
      ) : (
        <AdminDashboardPanels
          notificationsQuery={notificationsQuery}
          recentNotifications={recentNotifications}
        />
      )}
    </section>
  );
}

function AdminDashboardPanels({
  notificationsQuery,
  recentNotifications,
}: {
  notificationsQuery: ReturnType<typeof useQuery<unknown, Error, unknown, unknown[]>>;
  recentNotifications: UserNotification[];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <LatestNotificationsCard notificationsQuery={notificationsQuery} recentNotifications={recentNotifications} />

      <div className="space-y-4">
        <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <CardHeader className="space-y-2">
            <div className="inline-flex size-9 items-center justify-center rounded-lg bg-[var(--muted)] text-[var(--primary)]">
              <Database className="size-4" />
            </div>
            <CardTitle className="text-base font-semibold text-[var(--foreground)]">Manajemen Data</CardTitle>
            <p className="text-sm text-[var(--muted-foreground)]">
              Kelola siswa, instructor, categories, courses, dan vouchers dalam satu modul.
            </p>
          </CardHeader>
          <CardContent>
            <Link
              href="/admin/master-data/students"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary)] hover:opacity-80"
            >
              Buka Data Siswa
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
  );
}

function InstructorDashboardPanels({
  isLoading,
  notificationsQuery,
  recentNotifications,
  overview,
}: {
  isLoading: boolean;
  notificationsQuery: ReturnType<typeof useQuery<unknown, Error, unknown, unknown[]>>;
  recentNotifications: UserNotification[];
  overview: InstructorDashboardOverview | null;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-4">
        <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <CardHeader className="border-b border-[var(--border)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-semibold text-[var(--foreground)]">Ringkasan Course</CardTitle>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  Fokus pada kelas yang Anda ajar dan progres siswa pada offering yang sedang berjalan.
                </p>
              </div>
              <Link href="/admin/course-activity/student-progress" className="text-sm font-semibold text-[var(--primary)] hover:opacity-80">
                Lihat progres
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-24 animate-pulse rounded-xl bg-[var(--surface-soft)]" />
                ))}
              </div>
            ) : overview?.courses.length ? (
              <div className="space-y-3">
                {overview.courses.map((course) => (
                  <div
                    key={course.id}
                    className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="line-clamp-1 text-sm font-bold text-[var(--foreground)]">{course.title}</p>
                        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                          {course.category_name || "Tanpa kategori"} • {course.active_offerings_count} offering aktif
                        </p>
                      </div>
                      {course.active_offering_id ? (
                        <Link
                          href={`/admin/course-activity/student-progress?offeringId=${course.active_offering_id}`}
                          className="inline-flex h-8 shrink-0 items-center rounded-full bg-[var(--primary)] px-3 text-xs font-bold text-white transition hover:opacity-90"
                        >
                          Progres siswa
                        </Link>
                      ) : null}
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <StatChip icon={Users} label="Siswa aktif" value={String(course.active_students_count)} />
                      <StatChip icon={ClipboardCheck} label="Selesai" value={String(course.completed_students_count)} />
                      <StatChip icon={BookOpenText} label="Enrollment" value={String(course.total_enrollments_count)} />
                      <StatChip
                        icon={Star}
                        label="Review"
                        value={
                          course.total_reviews_count > 0 && course.average_rating !== null
                            ? `${course.average_rating} (${course.total_reviews_count})`
                            : "Belum ada"
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-soft)] px-4 py-6 text-sm text-[var(--muted-foreground)]">
                Belum ada course yang terhubung ke akun instructor ini.
              </div>
            )}
          </CardContent>
        </Card>

        <LatestNotificationsCard notificationsQuery={notificationsQuery} recentNotifications={recentNotifications} />
      </div>

      <div className="space-y-4">
        <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <CardHeader className="space-y-2">
            <div className="inline-flex size-9 items-center justify-center rounded-lg bg-[var(--muted)] text-[var(--primary)]">
              <Star className="size-4" />
            </div>
            <CardTitle className="text-base font-semibold text-[var(--foreground)]">Engagement Course</CardTitle>
            <p className="text-sm text-[var(--muted-foreground)]">
              Pantau review dan diskusi untuk melihat kualitas interaksi siswa di kelas Anda.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <InlineMetric
              label="Rata-rata rating"
              value={overview?.average_rating !== null && overview?.average_rating !== undefined ? `${overview.average_rating}/5` : "-"}
            />
            <InlineMetric label="Total review" value={String(overview?.total_reviews ?? 0)} />
            <InlineMetric label="Post forum bulan ini" value={String(overview?.forum_posts_this_month ?? 0)} />
            <InlineMetric label="Balasan forum bulan ini" value={String(overview?.forum_replies_this_month ?? 0)} />
          </CardContent>
        </Card>

        <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <CardHeader className="space-y-2">
            <div className="inline-flex size-9 items-center justify-center rounded-lg bg-[var(--muted)] text-[var(--primary)]">
              <MessageSquareText className="size-4" />
            </div>
            <CardTitle className="text-base font-semibold text-[var(--foreground)]">Aksi Cepat Mengajar</CardTitle>
            <p className="text-sm text-[var(--muted-foreground)]">
              Masuk langsung ke workspace untuk diskusi, review assignment, dan pemantauan progres siswa.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <QuickActionLink href="/admin/course-activity/forum" label="Forum Course" description="Moderasi diskusi dan pertanyaan siswa." />
            <QuickActionLink href="/admin/course-activity/assignment-reviews" label="Assignment Review" description="Tinjau submission yang menunggu penilaian." />
            <QuickActionLink href="/admin/course-activity/student-progress" label="Student Progress" description="Pantau progres per offering dan status penyelesaian." />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function LatestNotificationsCard({
  notificationsQuery,
  recentNotifications,
}: {
  notificationsQuery: ReturnType<typeof useQuery<unknown, Error, unknown, unknown[]>>;
  recentNotifications: UserNotification[];
}) {
  return (
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
            Belum ada notifikasi baru. Update penting untuk akun ini akan muncul di sini saat ada aktivitas yang perlu dipantau.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function QuickActionLink({
  href,
  label,
  description,
}: {
  href: string;
  label: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-start justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4 transition hover:border-[var(--primary)]/30 hover:bg-white"
    >
      <span>
        <span className="block text-sm font-semibold text-[var(--foreground)]">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-[var(--muted-foreground)]">{description}</span>
      </span>
      <ArrowRight className="mt-0.5 size-4 shrink-0 text-[var(--primary)]" />
    </Link>
  );
}

function InlineMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3">
      <span className="text-sm text-[var(--muted-foreground)]">{label}</span>
      <span className="text-sm font-bold text-[var(--foreground)]">{value}</span>
    </div>
  );
}

function StatChip({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2">
      <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
        <Icon className="size-3.5 text-[var(--primary)]" />
        {label}
      </span>
      <p className="mt-1 text-sm font-bold text-[var(--foreground)]">{value}</p>
    </div>
  );
}
