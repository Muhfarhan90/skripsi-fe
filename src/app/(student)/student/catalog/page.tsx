"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  addCourseToCart,
  getPublishedCourses,
  getStudentEnrollments,
} from "@/features/student/api/store-api";
import { ApiError } from "@/lib/api/client";

function formatCurrency(amount: number | null | undefined): string {
  const value = Number(amount ?? 0);
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function hasValidDiscount(price: number | null | undefined, discountPrice: number | null | undefined): boolean {
  const base = Number(price ?? 0);
  const discount = Number(discountPrice ?? 0);
  return discount > 0 && discount < base;
}

export default function StudentCatalogPage() {
  const queryClient = useQueryClient();

  const courseQuery = useQuery({
    queryKey: ["store", "courses"],
    queryFn: getPublishedCourses,
  });

  const enrollmentsQuery = useQuery({
    queryKey: ["student", "enrollments"],
    queryFn: getStudentEnrollments,
  });

  const addToCartMutation = useMutation({
    mutationFn: (courseId: number) => addCourseToCart(courseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student", "cart"] });
      toast.success("Course berhasil ditambahkan ke cart");
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        toast.error(error.message);
        return;
      }

      toast.error("Gagal menambahkan course ke cart");
    },
  });

  const enrolledCourseIds = new Set(
    (enrollmentsQuery.data ?? [])
      .filter((enrollment) => enrollment.status !== "cancelled")
      .map((enrollment) => enrollment.course_id),
  );

  const visibleCourses = (courseQuery.data ?? []).filter((course) => !enrolledCourseIds.has(course.id));
  const isLoading = courseQuery.isLoading || enrollmentsQuery.isLoading;
  const isError = courseQuery.isError || enrollmentsQuery.isError;

  return (
    <section className="space-y-5">
      <header className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h1 className="text-2xl font-semibold text-foreground">Katalog Course</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Course yang sudah di-enroll tidak ditampilkan pada daftar ini.
        </p>
      </header>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Memuat katalog course...</p>
      ) : null}
      {isError ? (
        <p className="text-sm text-red-600">Gagal memuat katalog course.</p>
      ) : null}

      {!isLoading && !isError && visibleCourses.length === 0 ? (
        <article className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">
            Tidak ada course baru. Semua course yang tersedia sudah ada di enrollment Anda.
          </p>
          <Link href="/student/enrollments" className="mt-3 inline-flex text-sm text-primary hover:underline">
            Lihat kelas aktif
          </Link>
        </article>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visibleCourses.map((course) => {
          const hasDiscount = hasValidDiscount(course.price, course.discount_price);
          const activePrice = hasDiscount ? Number(course.discount_price ?? 0) : Number(course.price ?? 0);

          return (
            <article key={course.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{course.status}</p>
              <h2 className="mt-2 line-clamp-2 text-lg font-semibold text-foreground">{course.title}</h2>
              <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                {course.description || "Deskripsi course belum tersedia."}
              </p>

              <div className="mt-4 space-y-1">
                {hasDiscount ? (
                  <p className="text-sm text-muted-foreground line-through">{formatCurrency(course.price)}</p>
                ) : null}
                <p className="text-xl font-semibold text-[var(--secondary)]">{formatCurrency(activePrice)}</p>
              </div>

              <div className="mt-5 flex items-center gap-2">
                <Link
                  href={`/courses/${course.slug}`}
                  className="inline-flex h-9 items-center rounded-md border border-border bg-card px-3 text-sm text-foreground transition hover:bg-muted"
                >
                  Detail
                </Link>
                <button
                  type="button"
                  onClick={() => addToCartMutation.mutate(course.id)}
                  disabled={addToCartMutation.isPending}
                  className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-70"
                >
                  Tambah ke Cart
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
