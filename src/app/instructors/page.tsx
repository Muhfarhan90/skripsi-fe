"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BookOpen, Search, Star, Users } from "lucide-react";
import { getPublicWebsiteSettings, getPublishedCourses } from "@/features/student/api/store-api";
import { PublicSiteHeader } from "@/features/website/components/public-site-header";
import { SiteFooter } from "@/features/website/components/site-footer";
import { buildPublicInstructorProfiles } from "@/features/website/lib/public-instructors";
import { createDefaultWebsiteSetting } from "@/features/website/lib/website-settings";

function formatReviewAverage(value: number | null | undefined): string {
  const numeric = Number(value ?? 0);
  return numeric > 0 ? numeric.toFixed(1) : "0.0";
}

export default function InstructorsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--background)]" />}>
      <InstructorsPageContent />
    </Suspense>
  );
}

function InstructorsPageContent() {
  const searchParams = useSearchParams();

  const courseQuery = useQuery({
    queryKey: ["store", "courses", "instructors"],
    queryFn: getPublishedCourses,
    staleTime: 5 * 60_000,
  });
  const websiteSettingsQuery = useQuery({
    queryKey: ["public", "website-settings"],
    queryFn: getPublicWebsiteSettings,
    staleTime: 5 * 60_000,
  });

  const courses = courseQuery.data ?? [];
  const instructors = buildPublicInstructorProfiles(courses);
  const searchKeyword = searchParams.get("search") ?? "";
  const searchQuery = searchKeyword.trim().toLowerCase();
  const websiteSettings = websiteSettingsQuery.data ?? createDefaultWebsiteSetting();

  const visibleInstructors = instructors.filter((instructor) => {
    if (!searchQuery) {
      return true;
    }

    return [
      instructor.name,
      instructor.description,
      ...instructor.categories,
      ...instructor.courses.map((course) => course.title),
      ...instructor.courses.map((course) => course.description ?? ""),
    ].some((value) => value.toLowerCase().includes(searchQuery));
  });

  const isLoading = courseQuery.isLoading || websiteSettingsQuery.isLoading;
  const isError = courseQuery.isError || websiteSettingsQuery.isError;

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <PublicSiteHeader settings={websiteSettings} courses={courses} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <section className="mb-8 overflow-hidden rounded-[2.25rem] border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--primary)]">
            {searchQuery ? `${visibleInstructors.length} instructor ditemukan` : `${instructors.length} instructor aktif`}
          </p>
          <div className="mt-3 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <h1 className="text-3xl font-black tracking-tight text-[var(--foreground)] sm:text-4xl">Instructor</h1>
              <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)] sm:text-base">
                Temukan instructor berdasarkan course yang mereka ajar, lalu buka detailnya untuk melihat semua course
                yang tersedia.
              </p>
            </div>

            <form
              action="/instructors"
              className="flex min-w-0 items-center rounded-full border border-[var(--border)] bg-white/85 px-4 py-2.5 shadow-sm transition focus-within:border-[var(--primary)] focus-within:ring-2 focus-within:ring-[var(--primary)]/10 lg:w-96"
            >
              <Search className="size-4 shrink-0 text-[var(--muted-foreground)]" />
              <input
                type="search"
                name="search"
                defaultValue={searchKeyword}
                placeholder="Cari instructor atau course..."
                className="min-w-0 flex-1 bg-transparent px-3 text-sm font-medium outline-none placeholder:text-[var(--muted-foreground)]"
              />
            </form>
          </div>
        </section>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="h-80 animate-pulse rounded-[2rem] bg-[var(--border)]" />
            ))}
          </div>
        ) : null}

        {isError ? (
          <div className="rounded-3xl border border-[var(--danger-soft-border)] bg-[var(--danger-soft-bg)] p-5 text-sm text-[var(--danger-soft-foreground)]">
            Gagal memuat daftar instructor. Silakan refresh halaman.
          </div>
        ) : null}

        {!isLoading && !isError && visibleInstructors.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-[var(--border)] bg-[var(--card)] py-16 text-center">
            <Users className="size-12 text-[var(--muted-foreground)]" />
            <div>
              <p className="font-bold text-[var(--foreground)]">
                {searchQuery ? "Instructor tidak ditemukan" : "Belum ada instructor yang tampil"}
              </p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Coba ubah kata kunci atau pastikan course published sudah punya instructor.
              </p>
            </div>
          </div>
        ) : null}

        {!isLoading && !isError ? (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {visibleInstructors.map((instructor) => (
              <article
                key={instructor.slug}
                className="group overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--card)] shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="bg-[var(--primary)]/10 p-6">
                  <div className="flex items-start justify-between gap-4">
                    <span className="inline-flex size-16 items-center justify-center rounded-3xl bg-[var(--primary)] text-lg font-black text-white shadow-lg">
                      {instructor.initials}
                    </span>
                    <span className="rounded-full border border-white/80 bg-white/80 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-[var(--foreground)]">
                      {instructor.courseCount} course
                    </span>
                  </div>

                  <div className="mt-6">
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--primary)]">Instructor</p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight text-[var(--foreground)]">{instructor.name}</h2>
                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--muted-foreground)]">
                      {instructor.description}
                    </p>
                  </div>
                </div>

                <div className="space-y-5 p-6">
                  <div className="flex flex-wrap gap-3 text-xs font-semibold text-[var(--muted-foreground)]">
                    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2">
                      <BookOpen className="size-3.5 text-[var(--primary)]" />
                      {instructor.featuredCourse.title}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2">
                      <Star className="size-3.5 text-amber-500" />
                      {instructor.averageRating !== null
                        ? `${formatReviewAverage(instructor.averageRating)} dari ${instructor.totalReviews} review`
                        : "Belum ada review"}
                    </span>
                  </div>

                  {instructor.categories.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {instructor.categories.slice(0, 4).map((category) => (
                        <span
                          key={category}
                          className="rounded-full bg-[var(--surface-soft)] px-3 py-1.5 text-[11px] font-bold text-[var(--foreground)]"
                        >
                          {category}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <Link
                    href={`/instructors/${instructor.slug}`}
                    className="inline-flex items-center gap-2 text-sm font-black text-[var(--primary)] transition hover:gap-3"
                  >
                    Lihat detail instructor
                    <ArrowRight className="size-4" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </main>

      <SiteFooter settings={websiteSettings} className="mt-12" />
    </div>
  );
}
