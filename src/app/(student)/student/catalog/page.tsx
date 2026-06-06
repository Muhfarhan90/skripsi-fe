"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, CreditCard, MessageSquareText, Star } from "lucide-react";
import { getPublishedCourses, getStudentEnrollments, getStudentOrders } from "@/features/student/api/store-api";
import { buildHiddenCatalogCourseIds } from "@/features/student/lib/catalog-visibility";
import { buildStudentCheckoutPath } from "@/features/student/lib/checkout";
import { formatDiscountBadge, hasValidDiscount } from "@/features/student/lib/pricing";

function formatCurrency(amount: number | null | undefined): string {
  const value = Number(amount ?? 0);
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatReviewAverage(value: number | null | undefined): string {
  const numeric = Number(value ?? 0);
  return numeric > 0 ? numeric.toFixed(1) : "0.0";
}

export default function StudentCatalogPage() {
  const courseQuery = useQuery({
    queryKey: ["store", "courses"],
    queryFn: getPublishedCourses,
  });

  const enrollmentsQuery = useQuery({
    queryKey: ["student", "enrollments"],
    queryFn: getStudentEnrollments,
  });

  const pendingOrdersQuery = useQuery({
    queryKey: ["student", "orders", "catalog-filter", "pending"],
    queryFn: () => getStudentOrders({ status: "pending", perPage: 100 }),
  });

  const hiddenCourseIds = buildHiddenCatalogCourseIds(
    enrollmentsQuery.data,
    pendingOrdersQuery.data,
  );

  const visibleCourses = (courseQuery.data ?? []).filter((course) => !hiddenCourseIds.has(course.id));
  const isLoading = courseQuery.isLoading || enrollmentsQuery.isLoading || pendingOrdersQuery.isLoading;
  const isError = courseQuery.isError || enrollmentsQuery.isError || pendingOrdersQuery.isError;

  return (
    <section className="space-y-4">
      {/* Header */}
      <header className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-4 shadow-sm">
        <h1 className="text-xl font-bold text-[var(--foreground)]">Katalog Course</h1>
        <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
          Course yang sudah di-enroll atau menunggu pembayaran tidak ditampilkan.
        </p>
      </header>

      {/* Loading skeleton */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
              <div className="aspect-[16/7] animate-pulse bg-[var(--border)]" />
              <div className="space-y-2 p-4">
                <div className="h-3 w-2/3 animate-pulse rounded-full bg-[var(--border)]" />
                <div className="h-4 w-full animate-pulse rounded-full bg-[var(--border)]" />
                <div className="h-3 w-full animate-pulse rounded-full bg-[var(--border)]" />
                <div className="h-3 w-3/4 animate-pulse rounded-full bg-[var(--border)]" />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Error */}
      {isError ? (
        <article className="rounded-xl border border-[var(--danger-soft-border)] bg-[var(--danger-soft-bg)] p-4 text-sm text-[var(--danger-soft-foreground)]">
          Gagal memuat katalog course. Silakan coba lagi.
        </article>
      ) : null}

      {/* Empty */}
      {!isLoading && !isError && visibleCourses.length === 0 ? (
        <article className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)] p-8 text-center shadow-sm">
          <BookOpen className="size-10 text-[var(--muted-foreground)]" />
          <div>
            <p className="font-semibold text-[var(--foreground)]">Tidak ada course baru</p>
            <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
              Semua course tersedia sudah ada di kelas kamu atau sedang menunggu pembayaran.
            </p>
          </div>
          <Link
            href="/student/enrollments"
            className="inline-flex h-9 items-center rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white transition active:scale-95"
          >
            Lihat Kelas Saya
          </Link>
        </article>
      ) : null}

      {/* Course grid */}
      {!isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleCourses.map((course) => {
            const hasDiscount = hasValidDiscount(course.price, course.discount_price);
            const activePrice = hasDiscount ? Number(course.discount_price ?? 0) : Number(course.price ?? 0);

            return (
              <article
                key={course.id}
                className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm transition hover:shadow-md"
              >
                {/* Thumbnail */}
                <div className="relative aspect-[16/7] bg-[var(--muted)]">
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[var(--primary)]/10 to-[var(--primary)]/20">
                    <BookOpen className="size-10 text-[var(--primary)]/40" />
                  </div>

                  {/* Status badge */}
                  <span className="absolute left-2.5 top-2.5 inline-flex rounded-lg bg-emerald-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
                    {course.status}
                  </span>

                  {/* Discount badge */}
                  {hasDiscount ? (
                    <span className="absolute right-2.5 top-2.5 inline-flex rounded-lg bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                      {formatDiscountBadge(course.price, course.discount_price)}
                    </span>
                  ) : null}
                </div>

                {/* Content */}
                <div className="p-4">
                  <h2 className="line-clamp-2 text-sm font-bold leading-snug text-[var(--foreground)]">{course.title}</h2>
                  <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-[var(--muted-foreground)]">
                    {course.description || "Deskripsi course belum tersedia."}
                  </p>

                  {/* Rating row */}
                  <div className="mt-3 flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
                    <span className="inline-flex items-center gap-1">
                      <Star className="size-3.5 fill-[var(--secondary)] text-[var(--secondary)]" />
                      <span className="font-semibold text-[var(--foreground)]">{formatReviewAverage(course.reviews_avg_rating)}</span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MessageSquareText className="size-3.5" />
                      {course.reviews_count ?? 0} review
                    </span>
                  </div>

                  {/* Price */}
                  <div className="mt-3 flex items-end justify-between gap-2">
                    <div>
                      {hasDiscount ? (
                        <p className="text-[11px] text-[var(--muted-foreground)] line-through">{formatCurrency(course.price)}</p>
                      ) : null}
                      <p className="text-base font-bold text-[var(--secondary)]">{formatCurrency(activePrice)}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-3.5 grid grid-cols-2 gap-2">
                    <Link
                      href={`/student/catalog/${course.slug}`}
                      className="inline-flex h-9 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] text-xs font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-hover)] active:scale-95"
                    >
                      Detail
                    </Link>
                    <Link
                      href={buildStudentCheckoutPath(course.slug)}
                      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-[var(--primary)] text-xs font-semibold text-white transition hover:opacity-90 active:scale-95 disabled:opacity-70"
                    >
                      <CreditCard className="size-3.5" />
                      Checkout
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
