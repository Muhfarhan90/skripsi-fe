"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { BookOpen } from "lucide-react";
import { getPublishedCourses, getStudentEnrollments, getStudentOrders } from "@/features/student/api/store-api";
import { buildHiddenCatalogCourseIds } from "@/features/student/lib/catalog-visibility";
import { buildStudentCheckoutPath } from "@/features/student/lib/checkout";
import { CourseCatalogCard } from "@/features/website/components/course-catalog-card";

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
    <section className="space-y-5">
      <header className="px-1 py-1">
        <h1 className="text-2xl font-black tracking-tight text-[var(--foreground)]">Katalog Course</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Jelajahi dan temukan course terbaik untuk mendukung proses belajar Anda.
        </p>
      </header>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
              <div className="aspect-[16/9] animate-pulse bg-[var(--border)]" />
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

      {isError ? (
        <article className="rounded-xl border border-[var(--danger-soft-border)] bg-[var(--danger-soft-bg)] p-4 text-sm text-[var(--danger-soft-foreground)]">
          Gagal memuat katalog course. Silakan coba lagi.
        </article>
      ) : null}

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

      {!isLoading ? (
        <div className="grid grid-cols-1 items-start gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {visibleCourses.map((course) => (
            <CourseCatalogCard
              key={course.id}
              actionHref={buildStudentCheckoutPath(course.slug)}
              actionLabel="Checkout"
              course={course}
              detailHref={`/student/catalog/${course.slug}`}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
