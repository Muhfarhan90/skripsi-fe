"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  addCourseToCart,
  getPublishedCourses,
  getStudentEnrollments,
} from "@/features/student/api/store-api";
import { useAuthStore } from "@/features/auth/store/auth-store";
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

export default function CoursesPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isStudentUser = user?.role_id === 3;

  const courseQuery = useQuery({
    queryKey: ["store", "courses"],
    queryFn: getPublishedCourses,
  });

  const enrollmentsQuery = useQuery({
    queryKey: ["student", "enrollments", "catalog-filter"],
    queryFn: getStudentEnrollments,
    enabled: isStudentUser,
  });

  const addToCartMutation = useMutation({
    mutationFn: (courseId: number) => addCourseToCart(courseId),
    onSuccess: () => {
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

  const handleAddToCart = (courseId: number) => {
    if (!user) {
      router.push("/login?redirect=/student/cart");
      return;
    }

    if (user.role_id !== 3) {
      toast.error("Fitur pembelian hanya tersedia untuk akun student");
      return;
    }

    addToCartMutation.mutate(courseId);
  };

  const enrolledCourseIds = new Set(
    (enrollmentsQuery.data ?? [])
      .filter((enrollment) => enrollment.status !== "cancelled")
      .map((enrollment) => enrollment.course_id),
  );

  const visibleCourses = (courseQuery.data ?? []).filter((course) => !enrolledCourseIds.has(course.id));
  const isLoading = courseQuery.isLoading || (isStudentUser && enrollmentsQuery.isLoading);
  const isError = courseQuery.isError || (isStudentUser && enrollmentsQuery.isError);

  return (
    <main className="min-h-screen bg-background px-6 py-10">
      <section className="mx-auto w-full max-w-6xl space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold text-zinc-900">Katalog Course</h1>
          <p className="text-sm text-zinc-600">
            Pilih course yang tersedia lalu lanjutkan checkout di dashboard student.
          </p>
        </header>

        {isLoading ? (
          <p className="text-sm text-zinc-500">Memuat katalog course...</p>
        ) : null}

        {isError ? (
          <p className="text-sm text-red-600">Gagal memuat katalog course.</p>
        ) : null}

        {!isLoading && !isError && visibleCourses.length === 0 ? (
          <article className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-zinc-600">
              Tidak ada course baru. Semua course yang tersedia sudah ada di enrollment Anda.
            </p>
          </article>
        ) : null}

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {visibleCourses.map((course) => {
            const hasDiscount = hasValidDiscount(course.price, course.discount_price);
            const activePrice = hasDiscount ? Number(course.discount_price ?? 0) : Number(course.price ?? 0);

            return (
              <article key={course.id} className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
                <p className="mb-2 text-xs font-medium tracking-wide text-zinc-500 uppercase">{course.status}</p>
                <h2 className="line-clamp-2 text-lg font-semibold text-zinc-900">{course.title}</h2>
                <p className="mt-2 line-clamp-3 text-sm text-zinc-600">
                  {course.description || "Deskripsi course belum tersedia."}
                </p>

                <div className="mt-4 space-y-1">
                  {hasDiscount ? (
                    <p className="text-sm text-zinc-400 line-through">{formatCurrency(course.price)}</p>
                  ) : null}
                  <p className="text-xl font-semibold text-emerald-700">{formatCurrency(activePrice)}</p>
                </div>

                <div className="mt-5 flex items-center gap-2">
                  <Link
                    href={`/courses/${course.slug}`}
                    className="inline-flex h-9 items-center rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-700 transition hover:bg-zinc-50"
                  >
                    Detail
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleAddToCart(course.id)}
                    disabled={addToCartMutation.isPending}
                    className="inline-flex h-9 items-center rounded-md bg-[#0F7A5A] px-3 text-sm font-medium text-white transition hover:bg-[#0d6b4f] disabled:opacity-70"
                  >
                    Tambah ke Cart
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
