"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShoppingCart, Star, Tags, UserRound } from "lucide-react";
import { toast } from "sonner";
import {
  addCourseToCart,
  getPublishedCourseBySlug,
  getStudentCourseReviews,
} from "@/features/student/api/store-api";
import { formatUtcDateTimeToJakarta } from "@/features/student/lib/date-time";
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

function getDiscountAmount(price: number | null | undefined, discountPrice: number | null | undefined): number {
  const base = Number(price ?? 0);
  const discount = Number(discountPrice ?? 0);
  return Math.max(base - discount, 0);
}

function parseTextItems(text: string | null | undefined): string[] {
  if (!text) {
    return [];
  }

  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return [];
  }

  if (normalized.startsWith("[") && normalized.endsWith("]")) {
    try {
      const parsed = JSON.parse(normalized);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => String(item).trim())
          .filter(Boolean);
      }
    } catch {
      // Fallback ke parsing teks biasa.
    }
  }

  if (normalized.includes("\n")) {
    return normalized
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return normalized
    .split(/[;,|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatReviewAverage(value: number | null | undefined): string {
  const numeric = Number(value ?? 0);
  return numeric > 0 ? numeric.toFixed(1) : "0.0";
}

function getReviewAvatarLabel(name: string | null | undefined): string {
  return name?.trim().charAt(0).toUpperCase() || "S";
}

function resolveReviewAvatar(avatar: string | null | undefined): string | null {
  if (!avatar) {
    return null;
  }

  if (avatar.startsWith("http://") || avatar.startsWith("https://") || avatar.startsWith("/")) {
    return avatar;
  }

  return `/storage/${avatar.replace(/^\/+/, "")}`;
}

function renderStars(value: number) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((index) => (
        <Star
          key={index}
          className={[
            "size-4",
            index <= Math.round(value)
              ? "fill-[var(--secondary)] text-[var(--secondary)]"
              : "text-zinc-300",
          ].join(" ")}
        />
      ))}
    </div>
  );
}

export default function StudentCatalogDetailPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const slug = typeof params.slug === "string" ? params.slug : "";

  const courseQuery = useQuery({
    queryKey: ["store", "course-detail", slug],
    queryFn: () => getPublishedCourseBySlug(slug),
    enabled: slug.length > 0,
  });
  const courseId = courseQuery.data?.id ?? null;

  const reviewsQuery = useQuery({
    queryKey: ["student", "course", courseId, "reviews"],
    queryFn: () => getStudentCourseReviews(courseId as number),
    enabled: Number.isFinite(courseId) && (courseId as number) > 0,
  });

  const addToCartMutation = useMutation({
    mutationFn: (courseId: number) => addCourseToCart(courseId),
    onSuccess: (_, courseId) => {
      queryClient.invalidateQueries({ queryKey: ["student", "cart"] });
      toast.success("Course berhasil ditambahkan ke cart");
      return courseId;
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        toast.error(error.message);
        return;
      }

      toast.error("Gagal menambahkan course ke cart");
    },
  });

  const handleAddToCart = async (goToCart: boolean) => {
    const course = courseQuery.data;
    if (!course) {
      return;
    }

    try {
      await addToCartMutation.mutateAsync(course.id);
      if (goToCart) {
        router.push("/student/cart");
      }
    } catch {
      // Error ditangani di onError.
    }
  };

  if (courseQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Memuat detail course...</p>;
  }

  if (courseQuery.isError || !courseQuery.data) {
    return (
      <section className="space-y-4">
        <p className="text-sm text-red-600">Course tidak ditemukan atau gagal dimuat.</p>
        <Link href="/student/catalog" className="inline-flex text-sm text-primary hover:underline">
          Kembali ke katalog
        </Link>
      </section>
    );
  }

  const course = courseQuery.data;
  const reviews = reviewsQuery.data ?? [];
  const hasDiscount = hasValidDiscount(course.price, course.discount_price);
  const activePrice = hasDiscount ? Number(course.discount_price ?? 0) : Number(course.price ?? 0);
  const requirements = parseTextItems(course.requirements);
  const outcomes = parseTextItems(course.outcomes);
  const averageRating = Number(course.reviews_avg_rating ?? 0);
  const reviewCount = Number(course.reviews_count ?? 0);
  const discountAmount = hasDiscount ? getDiscountAmount(course.price, course.discount_price) : 0;

  return (
    <section className="space-y-5">
      <header className="overflow-hidden rounded-[28px] border border-border bg-card shadow-sm">
        <div className="relative grid gap-6 p-6 lg:grid-cols-[minmax(0,1.35fr)_340px] lg:p-8">
          <div className="absolute top-0 right-0 h-44 w-44 rounded-full bg-[var(--secondary)]/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-[var(--primary)]/10 blur-3xl" />

          <div className="relative">
            <Link href="/student/catalog" className="inline-flex text-sm text-primary hover:underline">
              Kembali ke katalog
            </Link>

            <p className="mt-4 inline-flex rounded-full border border-[var(--primary)]/15 bg-[var(--primary)]/5 px-3 py-1 text-xs font-semibold tracking-[0.12em] text-[var(--primary)] uppercase">
              Course Detail
            </p>

            <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-tight text-foreground">
              {course.title}
            </h1>
            <p className="mt-3 max-w-4xl text-base leading-7 text-muted-foreground">
              {course.description || "Deskripsi course belum tersedia."}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {course.instructor_name ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-border bg-white/80 px-3 py-1.5 shadow-sm">
                  <UserRound className="size-4 text-[var(--primary)]" />
                  {course.instructor_name}
                </span>
              ) : null}
              {course.category_name ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-border bg-white/80 px-3 py-1.5 shadow-sm">
                  <Tags className="size-4 text-[var(--primary)]" />
                  {course.category_name}
                </span>
              ) : null}
            </div>
          </div>

          <aside className="relative rounded-[24px] border border-border bg-[linear-gradient(180deg,rgba(15,122,90,0.06),rgba(255,255,255,0.95))] p-5 shadow-sm">
            <p className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">Start Learning</p>

            <div className="mt-4 space-y-1">
              {hasDiscount ? (
                <p className="text-sm text-muted-foreground line-through">{formatCurrency(course.price)}</p>
              ) : null}
              <p className="text-4xl font-semibold text-foreground">{formatCurrency(activePrice)}</p>
              {hasDiscount ? (
                <p className="text-sm font-medium text-[var(--primary)]">
                  Hemat {formatCurrency(discountAmount)}
                </p>
              ) : null}
            </div>

            <div className="mt-5 rounded-2xl border border-border bg-white/80 p-4 text-sm text-muted-foreground">
              <p>
                Status: <span className="font-semibold text-foreground">{course.status}</span>
              </p>
              <p className="mt-2">
                Student reviews: <span className="font-semibold text-foreground">{reviewCount}</span>
              </p>
              <p className="mt-2">
                Average rating: <span className="font-semibold text-foreground">{formatReviewAverage(course.reviews_avg_rating)}</span>
              </p>
            </div>

            <div className="mt-5 space-y-3">
              <button
                type="button"
                onClick={() => handleAddToCart(true)}
                disabled={addToCartMutation.isPending}
                className="inline-flex h-11 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-70"
              >
                Checkout Sekarang
              </button>
              <button
                type="button"
                onClick={() => handleAddToCart(false)}
                disabled={addToCartMutation.isPending}
                className="inline-flex h-11 w-full items-center justify-center rounded-md border border-border bg-card px-4 text-sm font-medium text-foreground transition hover:bg-muted disabled:opacity-70"
              >
                <ShoppingCart className="mr-2 size-4" />
                Tambah ke Cart
              </button>
            </div>
          </aside>
        </div>
      </header>

      <article className="overflow-hidden rounded-[28px] border border-border bg-card shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[1fr_1fr_0.9fr]">
          <section className="bg-[linear-gradient(180deg,rgba(15,122,90,0.05),rgba(255,255,255,1))] p-6 lg:p-7">
            <h2 className="text-xl font-semibold text-foreground">Requirements</h2>
            {requirements.length > 0 ? (
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-7 text-muted-foreground">
                {requirements.map((item, index) => (
                  <li key={`requirement-${index}`}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">Belum ada requirement yang ditambahkan.</p>
            )}
          </section>

          <section className="border-t border-border bg-[linear-gradient(180deg,rgba(232,179,0,0.05),rgba(255,255,255,1))] p-6 lg:border-t-0 lg:border-l lg:p-7">
            <h2 className="text-xl font-semibold text-foreground">Outcomes</h2>
            {outcomes.length > 0 ? (
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-7 text-muted-foreground">
                {outcomes.map((item, index) => (
                  <li key={`outcome-${index}`}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">Belum ada outcomes yang ditambahkan.</p>
            )}
          </section>

          <section className="border-t border-border bg-white p-6 lg:border-t-0 lg:border-l lg:p-7">
            <h2 className="text-xl font-semibold text-foreground">Informasi Course</h2>
            <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
              <p>
                Status: <span className="font-medium text-foreground">{course.status}</span>
              </p>
              <p>
                Instructor: <span className="font-medium text-foreground">{course.instructor_name || "-"}</span>
              </p>
              <p>
                Kategori: <span className="font-medium text-foreground">{course.category_name || "-"}</span>
              </p>
            </div>
          </section>
        </div>
      </article>

      <article className="overflow-hidden rounded-[28px] border border-border bg-card shadow-sm">
        <div className="grid gap-6 p-6 lg:grid-cols-[260px_1fr] lg:p-8">
          <div className="rounded-[24px] border border-border bg-[linear-gradient(180deg,rgba(15,122,90,0.08),rgba(255,255,255,1))] p-5">
            <p className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">Student Reviews</p>
            <p className="mt-4 text-5xl font-semibold leading-none text-foreground">
              {formatReviewAverage(course.reviews_avg_rating)}
            </p>
            <div className="mt-3">{renderStars(averageRating)}</div>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              Berdasarkan {reviewCount} review student yang sudah menyelesaikan course ini.
            </p>
          </div>

          <div className="space-y-4">
          {reviewsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Memuat review kelas...</p>
          ) : null}

          {reviewsQuery.isError ? (
            <p className="text-sm text-red-600">Review kelas belum bisa dimuat.</p>
          ) : null}

          {!reviewsQuery.isLoading && !reviewsQuery.isError && reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada review untuk course ini.</p>
          ) : null}

            <div className="grid gap-4 xl:grid-cols-2">
              {reviews.map((review) => {
                const reviewerName = review.user?.fullname || "Student";
                const avatarUrl = resolveReviewAvatar(review.user?.avatar);

                return (
                  <article key={review.id} className="rounded-[24px] border border-border bg-[var(--surface-soft)] p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--primary)]/10 text-sm font-semibold text-[var(--primary)]">
                          {avatarUrl ? (
                            <div
                              aria-label={reviewerName}
                              className="h-full w-full bg-cover bg-center"
                              style={{ backgroundImage: `url("${avatarUrl}")` }}
                            />
                          ) : (
                            getReviewAvatarLabel(reviewerName)
                          )}
                        </div>

                        <div>
                          <p className="font-semibold text-foreground">{reviewerName}</p>
                          <div className="mt-2">{renderStars(review.rating)}</div>
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground">
                        {formatUtcDateTimeToJakarta(review.created_at)}
                      </p>
                    </div>

                    <p className="mt-4 text-sm leading-7 text-muted-foreground">
                      {review.review || "Student memberikan rating tanpa komentar tambahan."}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </article>
    </section>
  );
}
