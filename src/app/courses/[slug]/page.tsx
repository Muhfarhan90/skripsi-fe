"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { addCourseToCart, getPublishedCourseBySlug } from "@/features/student/api/store-api";
import { ApiError } from "@/lib/api/client";
import { useAuthStore } from "@/features/auth/store/auth-store";

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

export default function CourseDetailPage() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const user = useAuthStore((state) => state.user);

  const slug = typeof params.slug === "string" ? params.slug : "";

  const courseQuery = useQuery({
    queryKey: ["store", "course-detail", slug],
    queryFn: () => getPublishedCourseBySlug(slug),
    enabled: slug.length > 0,
  });

  const addToCartMutation = useMutation({
    mutationFn: (courseId: number) => addCourseToCart(courseId),
    onError: (error) => {
      if (error instanceof ApiError) {
        toast.error(error.message);
        return;
      }

      toast.error("Gagal menambahkan course ke cart");
    },
  });

  const handleBuy = async (goToCart: boolean) => {
    const course = courseQuery.data;
    if (!course) return;

    if (!user) {
      router.push("/login?redirect=/student/cart");
      return;
    }

    if (user.role_id !== 3) {
      toast.error("Fitur pembelian hanya tersedia untuk akun student");
      return;
    }

    try {
      await addToCartMutation.mutateAsync(course.id);
      toast.success("Course berhasil ditambahkan ke cart");
      if (goToCart) {
        router.push("/student/cart");
      }
    } catch {
      // Handled in onError
    }
  };

  if (courseQuery.isLoading) {
    return (
      <main className="min-h-screen bg-background px-6 py-10">
        <section className="mx-auto w-full max-w-4xl">
          <p className="text-sm text-zinc-500">Memuat detail course...</p>
        </section>
      </main>
    );
  }

  if (courseQuery.isError || !courseQuery.data) {
    return (
      <main className="min-h-screen bg-background px-6 py-10">
        <section className="mx-auto w-full max-w-4xl space-y-4">
          <p className="text-sm text-red-600">Course tidak ditemukan atau gagal dimuat.</p>
          <Link href="/courses" className="text-sm text-[#0F7A5A] hover:underline">
            Kembali ke katalog course
          </Link>
        </section>
      </main>
    );
  }

  const course = courseQuery.data;
  const hasDiscount = hasValidDiscount(course.price, course.discount_price);
  const activePrice = hasDiscount ? Number(course.discount_price ?? 0) : Number(course.price ?? 0);

  return (
    <main className="min-h-screen bg-background px-6 py-10">
      <section className="mx-auto w-full max-w-4xl space-y-6">
        <Link href="/courses" className="inline-flex text-sm text-[#0F7A5A] hover:underline">
          ← Kembali ke katalog
        </Link>

        <article className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="mb-2 text-xs font-medium tracking-wide text-zinc-500 uppercase">{course.status}</p>
          <h1 className="text-3xl font-semibold text-zinc-900">{course.title}</h1>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-zinc-600">
            {course.description || "Deskripsi course belum tersedia."}
          </p>

          <div className="mt-6 space-y-1">
            {hasDiscount ? (
              <p className="text-sm text-zinc-400 line-through">{formatCurrency(course.price)}</p>
            ) : null}
            <p className="text-2xl font-semibold text-emerald-700">{formatCurrency(activePrice)}</p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => handleBuy(false)}
              disabled={addToCartMutation.isPending}
              className="inline-flex h-10 items-center rounded-md border border-zinc-300 bg-white px-4 text-sm text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-70"
            >
              Tambah ke Cart
            </button>
            <button
              type="button"
              onClick={() => handleBuy(true)}
              disabled={addToCartMutation.isPending}
              className="inline-flex h-10 items-center rounded-md bg-[#0F7A5A] px-4 text-sm font-medium text-white transition hover:bg-[#0d6b4f] disabled:opacity-70"
            >
              Beli Sekarang
            </button>
          </div>
        </article>
      </section>
    </main>
  );
}
