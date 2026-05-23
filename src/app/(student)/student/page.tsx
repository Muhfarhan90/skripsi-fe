"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Bell,
  BookOpen,
  Clock3,
  GraduationCap,
  ReceiptText,
  Sparkles,
  Target,
} from "lucide-react";
import { useAuthStore } from "@/features/auth/store/auth-store";
import { getNotifications, notificationQueryKeys } from "@/features/notifications/api/notification-api";
import { getStudentEnrollments, getStudentOrders } from "@/features/student/api/store-api";
import { formatRemainingAccessTime } from "@/features/student/lib/date-time";
import type { UserNotification } from "@/types/notification";
import type { StoreEnrollment, StoreOrder } from "@/types/store";

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "2-digit",
  month: "long",
});

const shortDateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
});

function clampProgress(value: number | null | undefined): number {
  return Math.max(0, Math.min(100, Number(value ?? 0)));
}

function isCompletedEnrollment(enrollment: StoreEnrollment): boolean {
  return enrollment.status === "completed" || clampProgress(enrollment.progress) >= 100;
}

function getFirstName(fullName: string | null | undefined): string {
  return fullName?.trim().split(/\s+/)[0] || "Student";
}

function selectContinueLearningEnrollment(enrollments: StoreEnrollment[]): StoreEnrollment | null {
  const activeEnrollments = enrollments.filter((enrollment) => !isCompletedEnrollment(enrollment));

  return [...activeEnrollments].sort((left, right) => {
    const leftScore = clampProgress(left.progress) + (left.last_lesson_id ? 15 : 0);
    const rightScore = clampProgress(right.progress) + (right.last_lesson_id ? 15 : 0);
    return rightScore - leftScore;
  })[0] ?? null;
}

function selectLatestCompletedEnrollment(enrollments: StoreEnrollment[]): StoreEnrollment | null {
  const completed = enrollments.filter((enrollment) => isCompletedEnrollment(enrollment));

  return [...completed].sort((left, right) => {
    const leftTime = new Date(left.completed_at ?? left.updated_at).getTime();
    const rightTime = new Date(right.completed_at ?? right.updated_at).getTime();
    return rightTime - leftTime;
  })[0] ?? null;
}

function getContinueLearningHref(enrollment: StoreEnrollment): string {
  if (isCompletedEnrollment(enrollment)) {
    return `/student/enrollments/${enrollment.id}/learn?panel=certificate`;
  }

  return `/student/enrollments/${enrollment.id}`;
}

function getNotificationHref(notification: UserNotification): string {
  const route = notification.data?.route;
  return typeof route === "string" && route.trim() ? route : "/student/notifications";
}

function formatCurrency(value: number | null | undefined): string {
  return currencyFormatter.format(Number(value ?? 0));
}

function formatShortDate(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return shortDateFormatter.format(date);
}

function summarizeOrderItems(order: StoreOrder): string {
  if (order.items.length === 0) {
    return "Belum ada item";
  }

  const firstCourseTitle = order.items[0]?.course?.title;
  if (order.items.length === 1 && firstCourseTitle) {
    return firstCourseTitle;
  }

  if (firstCourseTitle) {
    return `${firstCourseTitle} +${order.items.length - 1} course`;
  }

  return `${order.items.length} course`;
}

function getHeroDescription(params: {
  continueLearningEnrollment: StoreEnrollment | null;
  activeEnrollmentsCount: number;
  completedEnrollmentsCount: number;
  unreadNotificationsCount: number;
  pendingOrdersCount: number;
}): string {
  const {
    continueLearningEnrollment,
    activeEnrollmentsCount,
    completedEnrollmentsCount,
    unreadNotificationsCount,
    pendingOrdersCount,
  } = params;

  if (continueLearningEnrollment) {
    const courseTitle = continueLearningEnrollment.course?.title ?? "kelas utama";
    return `${courseTitle} masih jadi fokus utama kamu. Jaga ritme belajar sambil pantau ${pendingOrdersCount} order pending dan ${unreadNotificationsCount} update terbaru.`;
  }

  if (activeEnrollmentsCount > 0) {
    return `Kamu punya ${activeEnrollmentsCount} kelas aktif. Pilih satu fokus belajar utama supaya progress lebih cepat naik dan ritme belajar tetap konsisten.`;
  }

  if (completedEnrollmentsCount > 0) {
    return `Kamu sudah menuntaskan ${completedEnrollmentsCount} kelas. Saatnya buka katalog lagi dan lanjutkan momentum ke course berikutnya.`;
  }

  return "Bangun dashboard belajar yang rapi dari course pertamamu. Mulai dari katalog, lalu lanjutkan progress secara konsisten.";
}

function getFocusNarrative(enrollment: StoreEnrollment | null): string {
  if (!enrollment) {
    return "Belum ada kelas aktif. Pilih course baru untuk mulai membangun progress belajar.";
  }

  const progress = clampProgress(enrollment.progress);
  if (progress >= 80) {
    return "Progress sudah masuk fase akhir. Dorong sedikit lagi agar kelas ini segera selesai.";
  }

  if (progress >= 45) {
    return "Ritme belajar sudah terbentuk. Pertahankan fokus agar progress cepat menembus 100%.";
  }

  return "Fondasi kelas ini sudah dimulai. Konsistensi beberapa sesi berikutnya akan terasa paling berdampak.";
}

function QuickActionCard({
  href,
  icon: Icon,
  title,
  note,
}: {
  href: string;
  icon: ComponentType<{ className?: string }>;
  title: string;
  note: string;
}) {
  return (
    <Link
      href={href}
      className="group flex min-h-32 flex-col justify-between rounded-[1.4rem] border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--primary)]/25 hover:shadow-md"
    >
      <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(15,122,90,0.14),rgba(244,196,0,0.22))] text-[var(--primary)]">
        <Icon className="size-5" />
      </span>
      <span className="min-w-0">
        <span className="flex items-center justify-between gap-3">
          <span className="block truncate text-sm font-semibold text-[var(--foreground)]">{title}</span>
          <ArrowRight className="size-4 shrink-0 text-[var(--muted-foreground)] transition group-hover:text-[var(--primary)]" />
        </span>
        <span className="mt-1 block text-xs leading-5 text-[var(--muted-foreground)]">{note}</span>
      </span>
    </Link>
  );
}

function ProgressLane({
  label,
  value,
  total,
  toneClass,
}: {
  label: string;
  value: number;
  total: number;
  toneClass: string;
}) {
  const width = total > 0 ? Math.max(8, Math.round((value / total) * 100)) : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-[var(--foreground)]">{label}</span>
        <span className="text-[var(--muted-foreground)]">
          <span className="font-semibold text-[var(--foreground)]">{value}</span> / {total}
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-[var(--surface-soft)]">
        {value > 0 ? <div className={`h-full rounded-full ${toneClass}`} style={{ width: `${width}%` }} /> : null}
      </div>
    </div>
  );
}

export default function StudentPage() {
  const user = useAuthStore((state) => state.user);
  const enrollmentsQuery = useQuery({
    queryKey: ["student", "enrollments"],
    queryFn: getStudentEnrollments,
    staleTime: 30_000,
  });
  const pendingOrdersQuery = useQuery({
    queryKey: ["student", "orders", "pending"],
    queryFn: () => getStudentOrders({ status: "pending", perPage: 3 }),
    staleTime: 30_000,
  });
  const notificationsQuery = useQuery({
    queryKey: notificationQueryKeys.feed(1, 4),
    queryFn: () => getNotifications({ page: 1, perPage: 4 }),
    staleTime: 30_000,
    refetchInterval: 15_000,
  });

  const enrollments = enrollmentsQuery.data ?? [];
  const pendingOrders = pendingOrdersQuery.data ?? [];
  const recentNotifications = notificationsQuery.data?.items ?? [];
  const continueLearningEnrollment = selectContinueLearningEnrollment(enrollments);
  const latestCompletedEnrollment = selectLatestCompletedEnrollment(enrollments);
  const activeEnrollmentsCount = enrollments.filter((enrollment) => !isCompletedEnrollment(enrollment)).length;
  const completedEnrollmentsCount = enrollments.filter((enrollment) => isCompletedEnrollment(enrollment)).length;
  const unreadNotificationsCount = notificationsQuery.data?.meta.unread_count ?? 0;
  const firstName = getFirstName(user?.fullname);
  const hasAnyError =
    enrollmentsQuery.isError || pendingOrdersQuery.isError || notificationsQuery.isError;
  const heroDescription = getHeroDescription({
    continueLearningEnrollment,
    activeEnrollmentsCount,
    completedEnrollmentsCount,
    unreadNotificationsCount,
    pendingOrdersCount: pendingOrders.length,
  });

  return (
    <section className="space-y-5">
      {hasAnyError ? (
        <div className="rounded-2xl border border-[var(--danger-soft-border)] bg-[var(--danger-soft-bg)] p-3 text-sm text-[var(--danger-soft-foreground)]">
          Sebagian data belum berhasil dimuat. Kamu masih bisa lanjut lewat menu kelas, notifikasi, atau order.
        </div>
      ) : null}

      <section className="overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--card)] shadow-sm">
        <div className="relative grid gap-6 p-5 sm:p-6 xl:grid-cols-[minmax(0,1.15fr)_24rem] xl:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(15,122,90,0.18),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(244,196,0,0.2),transparent_30%)]" />

          <div className="relative space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--primary)] backdrop-blur dark:bg-white/5">
              <Sparkles className="size-3.5" />
              Ruang Belajar
            </div>

            <div className="space-y-3">
              <p className="text-sm text-[var(--muted-foreground)]">{dateFormatter.format(new Date())}</p>
              <div className="space-y-2">
                <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-[var(--foreground)] sm:text-4xl">
                  Halo, {firstName}
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-[var(--muted-foreground)] sm:text-base">
                  {heroDescription}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href={continueLearningEnrollment ? getContinueLearningHref(continueLearningEnrollment) : "/student/catalog"}
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--primary-foreground)] transition hover:opacity-90 active:scale-[0.98]"
              >
                {continueLearningEnrollment ? "Lanjutkan kelas" : "Jelajahi katalog"}
              </Link>
              <Link
                href="/student/enrollments"
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-[var(--border)] bg-white/75 px-5 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-soft)] active:scale-[0.98] dark:bg-white/5"
              >
                Lihat semua kelas
              </Link>
            </div>
          </div>

          <div className="relative">
            {enrollmentsQuery.isLoading ? (
              <div className="h-full min-h-72 animate-pulse rounded-[1.75rem] border border-[var(--border)] bg-white/70 dark:bg-white/5" />
            ) : continueLearningEnrollment ? (
              <article className="overflow-hidden rounded-[1.75rem] border border-[var(--border)] bg-white/80 shadow-lg backdrop-blur dark:bg-[var(--card)]">
                <div className="relative aspect-[16/10] bg-[var(--surface-soft)]">
                  {continueLearningEnrollment.course?.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={continueLearningEnrollment.course.thumbnail}
                      alt={continueLearningEnrollment.course?.title ?? "Course thumbnail"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-[linear-gradient(135deg,rgba(15,122,90,0.12),rgba(244,196,0,0.18))] text-[var(--primary)]">
                      <BookOpen className="size-10" />
                    </div>
                  )}
                  <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-[var(--primary)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--primary-foreground)]">
                    <Target className="size-3.5" />
                    Fokus saat ini
                  </div>
                </div>

                <div className="space-y-4 p-5">
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2 text-[11px]">
                      <span className="rounded-full bg-[var(--secondary)] px-2.5 py-1 font-semibold text-[var(--secondary-foreground)]">
                        {clampProgress(continueLearningEnrollment.progress)}% progress
                      </span>
                      {continueLearningEnrollment.course?.category_name ? (
                        <span className="rounded-full border border-[var(--border)] px-2.5 py-1 font-medium text-[var(--muted-foreground)]">
                          {continueLearningEnrollment.course.category_name}
                        </span>
                      ) : null}
                    </div>
                    <h2 className="line-clamp-2 text-xl font-semibold leading-snug text-[var(--foreground)]">
                      {continueLearningEnrollment.course?.title ?? `Course #${continueLearningEnrollment.course_id}`}
                    </h2>
                    <p className="text-sm leading-6 text-[var(--muted-foreground)]">
                      {getFocusNarrative(continueLearningEnrollment)}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--muted-foreground)]">Sisa akses</span>
                      <span className="font-semibold text-[var(--foreground)]">
                        {formatRemainingAccessTime(
                          continueLearningEnrollment.ended_at ?? continueLearningEnrollment.expired_at,
                        )}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-soft)]">
                      <div
                        className="h-full rounded-full bg-[var(--primary)]"
                        style={{ width: `${clampProgress(continueLearningEnrollment.progress)}%` }}
                      />
                    </div>
                  </div>

                  <Link
                    href={getContinueLearningHref(continueLearningEnrollment)}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--primary-foreground)] transition hover:opacity-90 active:scale-[0.98]"
                  >
                    Buka kelas
                    <ArrowRight className="size-4" />
                  </Link>
                </div>
              </article>
            ) : (
              <article className="flex h-full min-h-72 flex-col justify-between rounded-[1.75rem] border border-dashed border-[var(--border)] bg-white/70 p-5 backdrop-blur dark:bg-white/5">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-[var(--surface-soft)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--primary)]">
                    <Sparkles className="size-3.5" />
                    Siap mulai
                  </div>
                  <h2 className="mt-4 text-2xl font-semibold text-[var(--foreground)]">Belum ada fokus belajar aktif</h2>
                  <p className="mt-2 text-sm leading-7 text-[var(--muted-foreground)]">
                    Ambil satu course dari katalog student lalu gunakan dashboard ini untuk memantau progres dan aktivitas belajarmu.
                  </p>
                </div>

                <Link
                  href="/student/catalog"
                  className="inline-flex h-11 items-center justify-center rounded-2xl bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--primary-foreground)] transition hover:opacity-90 active:scale-[0.98]"
                >
                  Buka katalog
                </Link>
              </article>
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <section className="rounded-[1.8rem] border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">Peta Belajar</p>
              <h2 className="mt-2 text-xl font-semibold text-[var(--foreground)]">Progress yang lebih mudah dibaca</h2>
            </div>
            <Link href="/student/enrollments" className="text-sm font-semibold text-[var(--primary)]">
              Detail kelas
            </Link>
          </div>

          <article className="mt-5 rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface-soft)] p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                  Distribusi belajar
                </p>
                <h3 className="mt-2 text-xl font-semibold text-[var(--foreground)]">
                  Ringkasan kelas aktif dan yang sudah selesai
                </h3>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--muted-foreground)]">
                  Lihat komposisi belajarmu secara cepat untuk tahu berapa kelas yang masih berjalan dan berapa yang sudah tuntas.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 font-medium text-[var(--foreground)]">
                  {activeEnrollmentsCount} kelas aktif
                </span>
                <span className="rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 font-medium text-[var(--foreground)]">
                  {completedEnrollmentsCount} kelas selesai
                </span>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <ProgressLane
                label="Aktif"
                value={activeEnrollmentsCount}
                total={Math.max(enrollments.length, 1)}
                toneClass="bg-[var(--primary)]"
              />
              <ProgressLane
                label="Selesai"
                value={completedEnrollmentsCount}
                total={Math.max(enrollments.length, 1)}
                toneClass="bg-[var(--secondary)]"
              />
            </div>
          </article>

          {latestCompletedEnrollment ? (
            <article className="mt-4 flex flex-col gap-3 rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface-soft)] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">
                  Pencapaian terbaru
                </p>
                <h3 className="mt-1 line-clamp-1 text-base font-semibold text-[var(--foreground)]">
                  {latestCompletedEnrollment.course?.title ?? `Course #${latestCompletedEnrollment.course_id}`}
                </h3>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  Selesai pada {formatShortDate(latestCompletedEnrollment.completed_at ?? latestCompletedEnrollment.updated_at)}
                </p>
              </div>
              <Link
                href={`/student/enrollments/${latestCompletedEnrollment.id}/learn?panel=certificate`}
                className="inline-flex h-10 shrink-0 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 text-sm font-semibold text-[var(--foreground)] transition hover:bg-white"
              >
                Lihat hasil
              </Link>
            </article>
          ) : null}
        </section>

        <section className="rounded-[1.8rem] border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm sm:p-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">Inbox & Transaksi</p>
            <h2 className="mt-2 text-xl font-semibold text-[var(--foreground)]">Aktivitas yang perlu dipantau</h2>
          </div>

          <div className="mt-5 space-y-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-[var(--foreground)]">Notifikasi terbaru</h3>
                <Link href="/student/notifications" className="text-xs font-semibold text-[var(--primary)]">
                  Buka inbox
                </Link>
              </div>

              {notificationsQuery.isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="h-16 animate-pulse rounded-2xl bg-[var(--surface-soft)]" />
                  ))}
                </div>
              ) : recentNotifications.length > 0 ? (
                recentNotifications.slice(0, 3).map((notification) => (
                  <Link
                    key={notification.id}
                    href={getNotificationHref(notification)}
                    className="flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-3 transition hover:border-[var(--primary)]/25 hover:bg-white"
                  >
                    <span
                      className={[
                        "mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-2xl",
                        notification.is_read
                          ? "bg-[var(--card)] text-[var(--muted-foreground)]"
                          : "bg-[var(--primary)] text-[var(--primary-foreground)]",
                      ].join(" ")}
                    >
                      <Bell className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-3">
                        <span className="line-clamp-1 text-sm font-semibold text-[var(--foreground)]">
                          {notification.title}
                        </span>
                        <span className="shrink-0 text-[11px] text-[var(--muted-foreground)]">
                          {formatShortDate(notification.sent_at ?? notification.created_at)}
                        </span>
                      </span>
                      <span className="mt-1 block line-clamp-2 text-xs leading-5 text-[var(--muted-foreground)]">
                        {notification.body}
                      </span>
                    </span>
                  </Link>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-soft)] p-4 text-sm text-[var(--muted-foreground)]">
                  Belum ada notifikasi baru.
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-[var(--foreground)]">Order pending</h3>
                <Link href="/student/orders" className="text-xs font-semibold text-[var(--primary)]">
                  Lihat order
                </Link>
              </div>

              {pendingOrdersQuery.isLoading ? (
                <div className="space-y-2">
                  {[1, 2].map((item) => (
                    <div key={item} className="h-20 animate-pulse rounded-2xl bg-[var(--surface-soft)]" />
                  ))}
                </div>
              ) : pendingOrders.length > 0 ? (
                pendingOrders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/student/orders/${order.id}`}
                    className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-3 transition hover:border-[var(--primary)]/25 hover:bg-white"
                  >
                    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--card)] text-[var(--primary)]">
                      <ReceiptText className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-[var(--foreground)]">
                        {order.order_code}
                      </span>
                      <span className="mt-1 block truncate text-xs text-[var(--muted-foreground)]">
                        {summarizeOrderItems(order)}
                      </span>
                      <span className="mt-1 block text-[11px] text-[var(--muted-foreground)]">
                        Dibuat {formatShortDate(order.created_at)}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-sm font-semibold text-[var(--foreground)]">
                        {formatCurrency(order.grand_total)}
                      </span>
                      <span className="mt-1 inline-flex rounded-full bg-[var(--secondary)] px-2.5 py-1 text-[10px] font-semibold text-[var(--secondary-foreground)]">
                        Pending
                      </span>
                    </span>
                  </Link>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-soft)] p-4 text-sm text-[var(--muted-foreground)]">
                  Tidak ada order pending saat ini.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">Akses Cepat</p>
            <h2 className="mt-1 text-xl font-semibold text-[var(--foreground)]">Buka area yang paling sering dipakai</h2>
          </div>
          <Clock3 className="hidden size-5 text-[var(--muted-foreground)] sm:block" />
        </div>

        <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
          <QuickActionCard href="/student/catalog" icon={BookOpen} title="Katalog" note="Cari course baru dan lanjut ke checkout." />
          <QuickActionCard href="/student/enrollments" icon={GraduationCap} title="Kelas Saya" note="Pantau progress dan akses materi kelas." />
          <QuickActionCard href="/student/orders" icon={ReceiptText} title="Orders" note="Cek pembayaran, invoice, dan status transaksi." />
        </div>
      </section>
    </section>
  );
}
