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
import type { StoreEnrollment, StoreOrder, StoreOrderItem } from "@/types/store";

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

function getOrderItemCourseTitle(item: StoreOrderItem | undefined): string | null {
  if (!item) {
    return null;
  }

  return (
    item.course_title?.trim() ||
    item.course_offering_snapshot?.course_title?.trim() ||
    item.course?.title?.trim() ||
    null
  );
}

function summarizeOrderItems(order: StoreOrder): string {
  if (order.items.length === 0) {
    return "Belum ada item";
  }

  const firstCourseTitle = getOrderItemCourseTitle(order.items[0]);
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
    return `Yuk lanjutkan belajar di kelas "${courseTitle}". Tetap semangat menyelesaikan materi hari ini! Ada ${pendingOrdersCount} order pending dan ${unreadNotificationsCount} pemberitahuan baru yang perlu Anda cek.`;
  }

  if (activeEnrollmentsCount > 0) {
    return `Anda memiliki ${activeEnrollmentsCount} kelas aktif yang sedang diikuti. Mari pilih salah satu kelas di bawah untuk melanjutkan petualangan belajar Anda!`;
  }

  if (completedEnrollmentsCount > 0) {
    return `Selamat! Anda telah menyelesaikan ${completedEnrollmentsCount} kelas. Ayo buka katalog kelas untuk mempelajari keahlian baru berikutnya!`;
  }

  return "Selamat datang! Mari mulai perjalanan belajar Anda dengan memilih kelas pertama dari katalog kami.";
}

function getFocusNarrative(enrollment: StoreEnrollment | null): string {
  if (!enrollment) {
    return "Belum ada kelas aktif. Pilih kelas baru di katalog untuk mulai belajar!";
  }

  const progress = clampProgress(enrollment.progress);
  if (progress >= 80) {
    return "Luar biasa! Belajar Anda sudah hampir selesai. Sedikit lagi Anda akan menuntaskan kelas ini!";
  }

  if (progress >= 45) {
    return "Progres belajar Anda berjalan dengan sangat baik. Pertahankan semangat untuk mencapai target!";
  }

  return "Awal yang bagus! Terus konsisten mengikuti materi agar pemahaman Anda semakin kuat.";
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
      className="group flex min-h-32 flex-col justify-between rounded-[1.4rem] bg-[var(--card)] p-4 shadow-[0_8px_30px_rgba(15,23,42,0.025)] border border-border/30 transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)]">
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
  const activeEnrollments = enrollments.filter((enrollment) => !isCompletedEnrollment(enrollment));
  const activeEnrollmentsCount = activeEnrollments.length;
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

      <section className="overflow-hidden rounded-[2rem] bg-[var(--card)] shadow-[0_8px_30px_rgba(15,23,42,0.03)] border border-border/30">
        <div className="relative grid gap-6 p-5 sm:p-6 xl:grid-cols-[minmax(0,1.15fr)_24rem] xl:p-8">

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
              <div className="h-full min-h-48 animate-pulse rounded-[1.75rem] border border-[var(--border)] bg-white/70 dark:bg-white/5" />
            ) : continueLearningEnrollment ? (
              <article className="overflow-hidden rounded-[1.75rem] bg-white/80 shadow-[0_12px_40px_rgba(0,0,0,0.04)] backdrop-blur border border-border/30 dark:bg-[var(--card)]">
                <div className="space-y-4 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-[var(--primary)]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--primary)]">
                      <Target className="size-3" />
                      Fokus saat ini
                    </div>
                    {continueLearningEnrollment.course?.category_name ? (
                      <span className="rounded-full border border-[var(--border)] px-2.5 py-0.5 text-[10px] font-semibold text-[var(--muted-foreground)]">
                        {continueLearningEnrollment.course.category_name}
                      </span>
                    ) : null}
                  </div>

                  <div className="space-y-1.5">
                    <h2 className="line-clamp-2 text-lg font-bold leading-snug text-[var(--foreground)]">
                      {continueLearningEnrollment.course?.title ?? `Course #${continueLearningEnrollment.course_id}`}
                    </h2>
                    <p className="text-xs leading-5 text-[var(--muted-foreground)]">
                      {getFocusNarrative(continueLearningEnrollment)}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[var(--muted-foreground)] font-medium">Progress kelas</span>
                      <span className="font-bold text-[var(--foreground)]">
                        {clampProgress(continueLearningEnrollment.progress)}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-soft)]">
                      <div
                        className="h-full rounded-full bg-[var(--secondary)]"
                        style={{ width: `${clampProgress(continueLearningEnrollment.progress)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <span className="text-[var(--muted-foreground)]">Sisa akses</span>
                      <span className="font-semibold text-[var(--foreground)]">
                        {formatRemainingAccessTime(
                          continueLearningEnrollment.ended_at ?? continueLearningEnrollment.expired_at,
                        )}
                      </span>
                    </div>
                  </div>

                  <Link
                    href={getContinueLearningHref(continueLearningEnrollment)}
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-xs font-bold text-[var(--primary-foreground)] transition hover:opacity-90 active:scale-[0.98]"
                  >
                    Buka kelas
                    <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              </article>
            ) : (
              <article className="flex h-full min-h-72 flex-col justify-between rounded-[1.75rem] border border-dashed border-[var(--border)]/60 bg-white/70 p-5 backdrop-blur dark:bg-white/5">
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
        <section className="rounded-[1.8rem] bg-[var(--card)] p-5 shadow-[0_8px_30px_rgba(15,23,42,0.025)] border border-border/30 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">Progress per Course</p>
              <h2 className="mt-2 text-xl font-semibold text-[var(--foreground)]">Progres kelas aktif {user?.fullname}</h2>
            </div>
            <Link href="/student/enrollments" className="text-sm font-semibold text-[var(--primary)]">
              Detail kelas
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {enrollmentsQuery.isLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-20 animate-pulse rounded-2xl bg-[var(--surface-soft)] border border-border/10" />
                ))}
              </div>
            ) : activeEnrollments.length > 0 ? (
              activeEnrollments.map((enrollment) => {
                const progress = clampProgress(enrollment.progress);
                return (
                  <Link
                    key={enrollment.id}
                    href={getContinueLearningHref(enrollment)}
                    className="group block rounded-2xl border border-border/30 bg-[var(--surface-soft)] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:bg-white dark:hover:bg-[var(--card)] hover:border-[var(--primary)]/20 active:scale-[0.99]"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-4">
                        <span className="font-semibold text-sm leading-snug text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
                          {enrollment.course?.title ?? `Course #${enrollment.course_id}`}
                        </span>
                        <span className="shrink-0 text-sm font-bold text-[var(--foreground)]">
                          {progress}%
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white dark:bg-[var(--card)] border border-border/10">
                        <div
                          className="h-full rounded-full bg-[var(--primary)] transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-soft)] p-6 text-center text-sm text-[var(--muted-foreground)]">
                <p>Tidak ada kelas aktif saat ini.</p>
                <Link
                  href="/student/catalog"
                  className="mt-3 inline-flex h-9 items-center justify-center rounded-xl bg-[var(--primary)] px-4 text-xs font-semibold text-[var(--primary-foreground)] transition hover:opacity-90"
                >
                  Cari Kelas
                </Link>
              </div>
            )}
          </div>

          {latestCompletedEnrollment ? (
            <article className="mt-4 flex flex-col gap-3 rounded-[1.5rem] bg-[var(--surface-soft)] p-4 sm:flex-row sm:items-center sm:justify-between">
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
                className="inline-flex h-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--card)] px-4 text-sm font-semibold text-[var(--foreground)] transition hover:bg-white border border-border/40 shadow-sm"
              >
                Lihat hasil
              </Link>
            </article>
          ) : null}
        </section>

        <section className="rounded-[1.8rem] bg-[var(--card)] p-5 shadow-[0_8px_30px_rgba(15,23,42,0.025)] border border-border/30 sm:p-6">
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
                    className="flex items-start gap-3 rounded-2xl bg-[var(--surface-soft)] p-3 transition hover:shadow-md hover:bg-[var(--card)]"
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
                    className="flex items-center gap-3 rounded-2xl bg-[var(--surface-soft)] p-3 transition hover:shadow-md hover:bg-[var(--card)]"
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
                      <span className="mt-1 inline-flex rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 px-2.5 py-1 text-[10px] font-semibold">
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
