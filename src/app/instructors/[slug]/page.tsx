"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Layers3, Search } from "lucide-react";
import { getPublicWebsiteSettings, getPublishedCourses } from "@/features/student/api/store-api";
import { CourseCatalogCard } from "@/features/website/components/course-catalog-card";
import { PublicSiteHeader } from "@/features/website/components/public-site-header";
import { SiteFooter } from "@/features/website/components/site-footer";
import { findPublicInstructorProfile } from "@/features/website/lib/public-instructors";
import { createDefaultWebsiteSetting } from "@/features/website/lib/website-settings";
import { resolvePublicFileUrl } from "@/lib/file-url";

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
        <section className="overflow-hidden rounded-[2.25rem] border border-[var(--border)] bg-[var(--card)] shadow-sm">
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

            <aside className="overflow-hidden rounded-[2rem] border border-white/80 bg-white/82 shadow-lg aspect-square">
              {instructor.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={resolvePublicFileUrl(instructor.avatarUrl) || undefined}
                  alt={instructor.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[var(--primary)]/10 text-[var(--primary)]">
                  <span className="text-5xl font-black">{instructor.initials}</span>
                </div>
              )}
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
              {visibleCourses.map((course) => (
                <CourseCatalogCard
                  key={course.id}
                  course={course}
                  detailHref={`/courses/${course.slug}`}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      <SiteFooter settings={websiteSettings} className="mt-12" />
    </div>
  );
}
