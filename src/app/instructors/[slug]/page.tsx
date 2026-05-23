"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, BookOpen, Layers3, Search, Star } from "lucide-react";
import { getPublicWebsiteSettings, getPublishedCourses } from "@/features/student/api/store-api";
import { PublicSiteHeader } from "@/features/website/components/public-site-header";
import { SiteFooter } from "@/features/website/components/site-footer";
import { findPublicInstructorProfile } from "@/features/website/lib/public-instructors";
import { createDefaultWebsiteSetting } from "@/features/website/lib/website-settings";

function formatCurrency(amount: number | null | undefined): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(amount ?? 0));
}

function hasValidDiscount(price: number | null | undefined, discountPrice: number | null | undefined): boolean {
  const base = Number(price ?? 0);
  const discount = Number(discountPrice ?? 0);
  return discount > 0 && discount < base;
}

function formatReviewAverage(value: number | null | undefined): string {
  const numeric = Number(value ?? 0);
  return numeric > 0 ? numeric.toFixed(1) : "0.0";
}

export default function InstructorDetailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--background)]" />}>
      <InstructorDetailPageContent />
    </Suspense>
  );
}

function InstructorDetailPageContent() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const slug = typeof params.slug === "string" ? params.slug : "";

  const courseQuery = useQuery({
    queryKey: ["store", "courses", "instructor-detail", slug],
    queryFn: getPublishedCourses,
    staleTime: 5 * 60_000,
  });
  const websiteSettingsQuery = useQuery({
    queryKey: ["public", "website-settings"],
    queryFn: getPublicWebsiteSettings,
    staleTime: 5 * 60_000,
  });

  const courses = courseQuery.data ?? [];
  const websiteSettings = websiteSettingsQuery.data ?? createDefaultWebsiteSetting();
  const instructor = slug ? findPublicInstructorProfile(courses, slug) : null;
  const searchKeyword = searchParams.get("search") ?? "";
  const searchQuery = searchKeyword.trim().toLowerCase();

  const visibleCourses = (instructor?.courses ?? []).filter((course) => {
    if (!searchQuery) {
      return true;
    }

    return [
      course.title,
      course.description,
      course.category_name,
    ].some((value) => value?.toLowerCase().includes(searchQuery));
  });

  if (courseQuery.isLoading || websiteSettingsQuery.isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        <PublicSiteHeader settings={websiteSettings} courses={courses} />
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <div className="h-10 w-48 animate-pulse rounded-xl bg-[var(--border)]" />
          <div className="mt-8 h-64 animate-pulse rounded-[2rem] bg-[var(--border)]" />
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-80 animate-pulse rounded-[2rem] bg-[var(--border)]" />
            ))}
          </div>
        </main>
        <SiteFooter settings={websiteSettings} className="mt-12" />
      </div>
    );
  }

  if (courseQuery.isError || websiteSettingsQuery.isError || !instructor) {
    return (
      <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        <PublicSiteHeader settings={websiteSettings} courses={courses} />
        <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <section className="rounded-3xl border border-[var(--danger-soft-border)] bg-[var(--danger-soft-bg)] p-5 text-sm text-[var(--danger-soft-foreground)]">
            <p>Detail instructor tidak ditemukan atau gagal dimuat.</p>
            <Link href="/instructors" className="mt-3 inline-flex items-center gap-2 font-semibold">
              <ArrowLeft className="size-4" />
              Kembali ke daftar instructor
            </Link>
          </section>
        </main>
        <SiteFooter settings={websiteSettings} className="mt-12" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <PublicSiteHeader settings={websiteSettings} courses={courses} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <section className="overflow-hidden rounded-[2.25rem] border border-[var(--border)] bg-[linear-gradient(135deg,#f7fbf9_0%,#edf5f2_48%,#fff8dc_100%)] shadow-sm">
          <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div>
              <Link
                href="/instructors"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary)] transition hover:opacity-80"
              >
                <ArrowLeft className="size-4" />
                Kembali ke daftar instructor
              </Link>

              <p className="mt-6 text-[11px] font-black uppercase tracking-[0.16em] text-[var(--primary)]">Instructor</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--foreground)] sm:text-5xl">
                {instructor.name}
              </h1>
              <p className="mt-4 max-w-3xl whitespace-pre-line text-sm leading-7 text-[var(--muted-foreground)] sm:text-base">
                {instructor.description}
              </p>

              {instructor.categories.length > 0 ? (
                <div className="mt-6 flex flex-wrap gap-2">
                  {instructor.categories.map((category) => (
                    <span
                      key={category}
                      className="rounded-full border border-white/70 bg-white/75 px-3 py-1.5 text-[11px] font-bold text-[var(--foreground)]"
                    >
                      {category}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <aside className="overflow-hidden rounded-[2rem] border border-white/80 bg-white/82 shadow-lg">
              <div className="relative aspect-[16/10] bg-[linear-gradient(135deg,rgba(15,122,90,0.14)_0%,rgba(217,175,0,0.2)_100%)]">
                {instructor.featuredCourse.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={instructor.featuredCourse.thumbnail}
                    alt={instructor.featuredCourse.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <BookOpen className="size-14 text-[var(--primary)]/35" />
                  </div>
                )}
                <span className="absolute left-4 top-4 rounded-full bg-black/55 px-3 py-1 text-[10px] font-black text-white backdrop-blur">
                  Course unggulan
                </span>
              </div>

              <div className="space-y-4 p-5">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--primary)]">Pilihan utama</p>
                  <h2 className="mt-2 text-lg font-black text-[var(--foreground)]">{instructor.featuredCourse.title}</h2>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-[var(--muted-foreground)]">
                    {instructor.featuredCourse.description || "Course ini menjadi salah satu pilihan utama dari instructor ini."}
                  </p>
                </div>

                <Link
                  href={`/courses/${instructor.featuredCourse.slug}`}
                  className="inline-flex items-center gap-2 text-sm font-black text-[var(--primary)] transition hover:gap-3"
                >
                  Buka detail course
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </aside>
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--primary)]">
                {searchQuery ? `${visibleCourses.length} course ditemukan` : `${visibleCourses.length} course ditampilkan`}
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-[var(--foreground)] sm:text-3xl">
                Course oleh {instructor.name}
              </h2>
            </div>

            <form
              action={`/instructors/${instructor.slug}`}
              className="flex min-w-0 items-center rounded-full border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 transition focus-within:border-[var(--primary)] focus-within:bg-white focus-within:ring-2 focus-within:ring-[var(--primary)]/10 lg:w-96"
            >
              <Search className="size-4 shrink-0 text-[var(--muted-foreground)]" />
              <input
                type="search"
                name="search"
                defaultValue={searchKeyword}
                placeholder="Cari course instructor ini..."
                className="min-w-0 flex-1 bg-transparent px-3 text-sm font-medium outline-none placeholder:text-[var(--muted-foreground)]"
              />
            </form>
          </div>

          {visibleCourses.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-[var(--border)] bg-[var(--card)] py-16 text-center">
              <Layers3 className="size-12 text-[var(--muted-foreground)]" />
              <div>
                <p className="font-bold text-[var(--foreground)]">
                  {searchQuery ? "Course tidak ditemukan" : "Belum ada course untuk instructor ini"}
                </p>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  Coba ubah kata kunci pencarian atau cek kembali nanti.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {visibleCourses.map((course) => {
                const hasDiscount = hasValidDiscount(course.price, course.discount_price);
                const activePrice = hasDiscount ? Number(course.discount_price ?? 0) : Number(course.price ?? 0);
                const reviewCount = Number(course.reviews_count ?? 0);

                return (
                  <article
                    key={course.id}
                    className="group overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--card)] shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                  >
                    <div className="relative aspect-[16/10] bg-[linear-gradient(135deg,rgba(15,122,90,0.12)_0%,rgba(217,175,0,0.18)_100%)]">
                      {course.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={course.thumbnail} alt={course.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <BookOpen className="size-12 text-[var(--primary)]/30" />
                        </div>
                      )}
                      {course.category_name ? (
                        <span className="absolute left-3 top-3 rounded-full bg-black/55 px-3 py-1 text-[10px] font-bold text-white backdrop-blur">
                          {course.category_name}
                        </span>
                      ) : null}
                    </div>

                    <div className="space-y-4 p-5">
                      <div>
                        <h3 className="line-clamp-2 text-lg font-black leading-snug text-[var(--foreground)] transition group-hover:text-[var(--primary)]">
                          {course.title}
                        </h3>
                        <p className="mt-2 line-clamp-3 text-sm leading-6 text-[var(--muted-foreground)]">
                          {course.description || "Deskripsi course belum tersedia."}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-3 text-xs font-semibold text-[var(--muted-foreground)]">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2">
                          <Star className="size-3.5 text-amber-500" />
                          {reviewCount > 0
                            ? `${formatReviewAverage(course.reviews_avg_rating)} - ${reviewCount} review`
                            : "Belum ada review"}
                        </span>
                      </div>

                      <div className="flex items-end justify-between gap-3">
                        <div>
                          {hasDiscount ? (
                            <p className="text-[11px] text-[var(--muted-foreground)] line-through">
                              {formatCurrency(course.price)}
                            </p>
                          ) : null}
                          <p className="text-lg font-black text-[var(--secondary)]">{formatCurrency(activePrice)}</p>
                        </div>

                        <Link
                          href={`/courses/${course.slug}`}
                          className="inline-flex h-10 items-center gap-2 rounded-full bg-[var(--primary)] px-4 text-xs font-black text-white transition hover:opacity-90"
                        >
                          Detail course
                          <ArrowRight className="size-3.5" />
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <SiteFooter settings={websiteSettings} className="mt-12" />
    </div>
  );
}
