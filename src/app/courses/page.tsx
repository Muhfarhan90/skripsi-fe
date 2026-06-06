"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, CreditCard, MessageSquareText, Search, Star } from "lucide-react";
import { toast } from "sonner";
import {
  getPublicWebsiteSettings,
  getPublishedCourses,
  getStudentEnrollments,
  getStudentOrders,
} from "@/features/student/api/store-api";
import { buildHiddenCatalogCourseIds } from "@/features/student/lib/catalog-visibility";
import {
  buildStudentCheckoutLoginRedirect,
  buildStudentCheckoutPath,
} from "@/features/student/lib/checkout";
import { formatDiscountBadge, hasValidDiscount } from "@/features/student/lib/pricing";
import { isStudentRole } from "@/features/auth/lib/roles";
import { useAuthStore } from "@/features/auth/store/auth-store";
import { PublicSiteHeader } from "@/features/website/components/public-site-header";
import { SiteFooter } from "@/features/website/components/site-footer";
import { getCourseInstructorHref, getPublicInstructorInitials } from "@/features/website/lib/public-instructors";
import { createDefaultWebsiteSetting } from "@/features/website/lib/website-settings";

function formatCurrency(amount: number | null | undefined): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(amount ?? 0));
}

export default function CoursesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--background)]" />}>
      <CoursesPageContent />
    </Suspense>
  );
}

function CoursesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAuthStore((state) => state.user);
  const isStudentUser = isStudentRole(user?.role_name, user?.role_id);

  const courseQuery = useQuery({
    queryKey: ["store", "courses"],
    queryFn: getPublishedCourses,
  });
  const websiteSettingsQuery = useQuery({
    queryKey: ["public", "website-settings"],
    queryFn: getPublicWebsiteSettings,
    staleTime: 5 * 60_000,
  });
  const enrollmentsQuery = useQuery({
    queryKey: ["student", "enrollments", "catalog-filter"],
    queryFn: getStudentEnrollments,
    enabled: isStudentUser,
  });
  const pendingOrdersQuery = useQuery({
    queryKey: ["student", "orders", "catalog-filter", "pending"],
    queryFn: () => getStudentOrders({ status: "pending", perPage: 100 }),
    enabled: isStudentUser,
  });

  const allCourses = courseQuery.data ?? [];
  const hiddenCourseIds = buildHiddenCatalogCourseIds(enrollmentsQuery.data, pendingOrdersQuery.data);
  const searchKeyword = searchParams.get("search") ?? "";
  const searchQuery = searchKeyword.trim().toLowerCase();
  const selectedCategory = (searchParams.get("category") ?? "").trim();
  const websiteSettings = websiteSettingsQuery.data ?? createDefaultWebsiteSetting();
  const categories = Array.from(
    new Set(
      allCourses
        .map((course) => course.category_name?.trim())
        .filter((category): category is string => Boolean(category)),
    ),
  );

  const visibleCourses = allCourses
    .filter((course) => !hiddenCourseIds.has(course.id))
    .filter((course) => !selectedCategory || course.category_name === selectedCategory)
    .filter((course) => {
      if (!searchQuery) {
        return true;
      }

      return [
        course.title,
        course.description,
        course.category_name,
        course.instructor_name,
      ].some((value) => value?.toLowerCase().includes(searchQuery));
    });

  const isLoading =
    courseQuery.isLoading ||
    (isStudentUser && (enrollmentsQuery.isLoading || pendingOrdersQuery.isLoading));
  const isError =
    courseQuery.isError ||
    (isStudentUser && (enrollmentsQuery.isError || pendingOrdersQuery.isError));

  const handleStartCheckout = (courseSlug: string) => {
    if (!user) {
      router.push(buildStudentCheckoutLoginRedirect(courseSlug));
      return;
    }

    if (!isStudentRole(user.role_name, user.role_id)) {
      toast.error("Fitur pembelian hanya tersedia untuk akun student");
      return;
    }

    router.push(buildStudentCheckoutPath(courseSlug));
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <PublicSiteHeader settings={websiteSettings} courses={allCourses} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-8 rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--primary)]">
            {searchQuery || selectedCategory
              ? `${visibleCourses.length} hasil ditemukan`
              : `${visibleCourses.length} course tersedia`}
          </p>
          <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-[var(--foreground)] sm:text-4xl">Courses</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">
                {searchQuery
                  ? `Hasil pencarian untuk "${searchKeyword}".`
                  : selectedCategory
                    ? `Menampilkan course pada kategori ${selectedCategory}.`
                    : "Pilih course yang ingin dipelajari, lihat instructor, lalu mulai belajar dari katalog."}
              </p>
            </div>

            <form
              action="/courses"
              className="flex min-w-0 items-center rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-2.5 transition focus-within:border-[var(--primary)] focus-within:bg-white focus-within:ring-2 focus-within:ring-[var(--primary)]/10 lg:w-96"
            >
              <Search className="size-4 shrink-0 text-[var(--muted-foreground)]" />
              <input
                type="search"
                name="search"
                defaultValue={searchKeyword}
                placeholder="Cari course atau instructor..."
                className="min-w-0 flex-1 bg-transparent px-3 text-sm font-medium outline-none placeholder:text-[var(--muted-foreground)]"
              />
            </form>
          </div>

          {categories.length > 0 ? (
            <div className="native-horizontal-scroll mt-6 flex gap-2 overflow-x-auto pb-1">
              <Link
                href={searchKeyword ? `/courses?search=${encodeURIComponent(searchKeyword)}` : "/courses"}
                className={`whitespace-nowrap rounded-full border px-4 py-2 text-xs font-bold transition ${
                  !selectedCategory
                    ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                    : "border-[var(--border)] bg-[var(--surface-soft)] text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
                }`}
              >
                Semua
              </Link>
              {categories.map((category) => {
                const href = `/courses?category=${encodeURIComponent(category)}${searchKeyword ? `&search=${encodeURIComponent(searchKeyword)}` : ""}`;

                return (
                  <Link
                    key={category}
                    href={href}
                    className={`whitespace-nowrap rounded-full border px-4 py-2 text-xs font-bold transition ${
                      selectedCategory === category
                        ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                        : "border-[var(--border)] bg-[var(--surface-soft)] text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
                    }`}
                  >
                    {category}
                  </Link>
                );
              })}
            </div>
          ) : null}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div key={item} className="h-96 animate-pulse rounded-3xl bg-[var(--border)]" />
            ))}
          </div>
        ) : null}

        {isError ? (
          <div className="rounded-3xl border border-[var(--danger-soft-border)] bg-[var(--danger-soft-bg)] p-5 text-sm text-[var(--danger-soft-foreground)]">
            Gagal memuat courses. Silakan refresh halaman.
          </div>
        ) : null}

        {!isLoading && !isError && visibleCourses.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-[var(--border)] bg-[var(--card)] py-16 text-center">
            <BookOpen className="size-12 text-[var(--muted-foreground)]" />
            <div>
              <p className="font-bold text-[var(--foreground)]">
                {searchQuery || selectedCategory ? "Course tidak ditemukan" : "Belum ada course tersedia"}
              </p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Coba ubah kata kunci atau pilih kategori lain.
              </p>
            </div>
          </div>
        ) : null}

        {!isLoading && !isError ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visibleCourses.map((course) => {
              const hasDiscount = hasValidDiscount(course.price, course.discount_price);
              const activePrice = hasDiscount ? Number(course.discount_price ?? 0) : Number(course.price ?? 0);
              const rating = Number(course.reviews_avg_rating ?? 0);
              const reviewCount = course.reviews_count ?? 0;
              const instructorHref = getCourseInstructorHref(course);

              return (
                <article
                  key={course.id}
                  className="group overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="relative aspect-[16/10] bg-gradient-to-br from-[var(--primary)]/10 to-[var(--secondary)]/20">
                    {course.thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={course.thumbnail} alt={course.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <BookOpen className="size-14 text-[var(--primary)]/30" />
                      </div>
                    )}
                    {course.category_name ? (
                      <span className="absolute left-3 top-3 rounded-full bg-black/55 px-3 py-1 text-[10px] font-bold text-white backdrop-blur">
                        {course.category_name}
                      </span>
                    ) : null}
                    {hasDiscount ? (
                      <span className="absolute right-3 top-3 rounded-full bg-rose-500 px-3 py-1 text-[10px] font-black text-white shadow">
                        {formatDiscountBadge(course.price, course.discount_price)}
                      </span>
                    ) : null}
                    {course.instructor_name ? (
                      <span className="absolute -bottom-7 right-5 inline-flex size-14 items-center justify-center rounded-full border-4 border-white bg-[var(--primary)] text-sm font-black text-white shadow-lg">
                        {getPublicInstructorInitials(course.instructor_name)}
                      </span>
                    ) : null}
                  </div>

                  <div className="p-5 pt-8">
                    <h2 className="line-clamp-2 text-base font-black leading-snug text-[var(--foreground)] transition group-hover:text-[var(--primary)]">
                      {course.title}
                    </h2>
                    {course.instructor_name ? (
                      instructorHref ? (
                        <Link
                          href={instructorHref}
                          className="mt-2 inline-flex text-xs font-semibold text-[var(--muted-foreground)] transition hover:text-[var(--primary)]"
                        >
                          {course.instructor_name}
                        </Link>
                      ) : (
                        <p className="mt-2 text-xs font-semibold text-[var(--muted-foreground)]">
                          {course.instructor_name}
                        </p>
                      )
                    ) : null}
                    {reviewCount > 0 ? (
                      <div className="mt-3 flex items-center gap-1.5">
                        <span className="text-xs font-black text-amber-500">{rating.toFixed(1)}</span>
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`size-3 ${
                                star <= Math.round(rating)
                                  ? "fill-amber-400 text-amber-400"
                                  : "fill-[var(--border)] text-[var(--border)]"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="flex items-center gap-0.5 text-[11px] text-[var(--muted-foreground)]">
                          <MessageSquareText className="size-3" />
                          {reviewCount}
                        </span>
                      </div>
                    ) : null}
                    {course.description ? (
                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--muted-foreground)]">
                        {course.description}
                      </p>
                    ) : null}
                    <div className="mt-5 flex items-end justify-between gap-3">
                      <div>
                        {hasDiscount ? (
                          <p className="text-[11px] text-[var(--muted-foreground)] line-through">
                            {formatCurrency(course.price)}
                          </p>
                        ) : null}
                        <p className="text-lg font-black text-[var(--secondary)]">{formatCurrency(activePrice)}</p>
                      </div>
                      <div className="flex gap-2">
                        <Link
                          href={`/courses/${course.slug}`}
                          className="inline-flex h-9 items-center rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-4 text-xs font-bold text-[var(--foreground)] transition hover:bg-[var(--surface-hover)]"
                        >
                          Detail
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleStartCheckout(course.slug)}
                          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--primary)] px-4 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-70"
                        >
                          <CreditCard className="size-3.5" />
                          {user ? "Checkout" : "Masuk"}
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </main>

      <SiteFooter settings={websiteSettings} className="mt-12" />
    </div>
  );
}
