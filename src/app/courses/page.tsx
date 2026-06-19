"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Search } from "lucide-react";
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
import { isStudentRole } from "@/features/auth/lib/roles";
import { useAuthStore } from "@/features/auth/store/auth-store";
import { CourseCatalogCard } from "@/features/website/components/course-catalog-card";
import { PublicSiteHeader } from "@/features/website/components/public-site-header";
import { SiteFooter } from "@/features/website/components/site-footer";
import { createDefaultWebsiteSetting } from "@/features/website/lib/website-settings";

interface CoursesHrefFilters {
  category?: string;
  search?: string;
  skill?: string;
}

function buildCoursesHref({ category, search, skill }: CoursesHrefFilters): string {
  const params = new URLSearchParams();
  const normalizedSearch = search?.trim();
  const normalizedCategory = category?.trim();
  const normalizedSkill = skill?.trim();

  if (normalizedSearch) {
    params.set("search", normalizedSearch);
  }

  if (normalizedCategory) {
    params.set("category", normalizedCategory);
  }

  if (normalizedSkill) {
    params.set("skill", normalizedSkill);
  }

  const query = params.toString();
  return query ? `/courses?${query}` : "/courses";
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
  const selectedSkill = (searchParams.get("skill") ?? "").trim();
  const websiteSettings = websiteSettingsQuery.data ?? createDefaultWebsiteSetting();
  const categories = Array.from(
    new Set(
      allCourses
        .map((course) => course.category_name?.trim())
        .filter((category): category is string => Boolean(category)),
    ),
  );
  const skills = Array.from(
    new Map(
      allCourses
        .flatMap((course) => course.skills ?? [])
        .filter((skill) => Boolean(skill.name?.trim()))
        .map((skill) => [
          skill.slug || String(skill.id),
          {
            ...skill,
            name: skill.name.trim(),
          },
        ]),
    ).values(),
  ).sort((left, right) => left.name.localeCompare(right.name));
  const selectedSkillName =
    skills.find((skill) => (skill.slug || String(skill.id)) === selectedSkill)?.name ?? selectedSkill;
  const hasActiveFilters = Boolean(searchQuery || selectedCategory || selectedSkill);
  const filterSummary = [
    searchQuery ? `pencarian "${searchKeyword.trim()}"` : null,
    selectedCategory ? `kategori ${selectedCategory}` : null,
    selectedSkill ? `skill ${selectedSkillName}` : null,
  ].filter((item): item is string => Boolean(item));

  const visibleCourses = allCourses
    .filter((course) => !hiddenCourseIds.has(course.id))
    .filter((course) => !selectedCategory || course.category_name === selectedCategory)
    .filter((course) =>
      !selectedSkill ||
      (course.skills ?? []).some((skill) => (skill.slug || String(skill.id)) === selectedSkill),
    )
    .filter((course) => {
      if (!searchQuery) {
        return true;
      }

      return [
        course.title,
        course.description,
        course.category_name,
        course.instructor_name,
        ...(course.skills ?? []).flatMap((skill) => [skill.name, skill.slug]),
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
            {hasActiveFilters
              ? `${visibleCourses.length} hasil ditemukan`
              : `${visibleCourses.length} course tersedia`}
          </p>
          <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-[var(--foreground)] sm:text-4xl">Courses</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">
                {filterSummary.length > 0
                  ? `Menampilkan course untuk ${filterSummary.join(", ")}.`
                  : "Pilih course yang ingin dipelajari, lihat instructor, lalu mulai belajar dari katalog."}
              </p>
            </div>

            <form
              action="/courses"
              className="flex min-w-0 items-center rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-2.5 transition focus-within:border-[var(--primary)] focus-within:bg-white focus-within:ring-2 focus-within:ring-[var(--primary)]/10 lg:w-96"
            >
              {selectedCategory ? <input type="hidden" name="category" value={selectedCategory} /> : null}
              {selectedSkill ? <input type="hidden" name="skill" value={selectedSkill} /> : null}
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

          {categories.length > 0 || skills.length > 0 ? (
            <div className="mt-6 space-y-4">
              {categories.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                    Kategori
                  </p>
                  <div className="native-horizontal-scroll flex gap-2 overflow-x-auto pb-1">
                    <Link
                      href={buildCoursesHref({ search: searchKeyword, skill: selectedSkill })}
                      className={`whitespace-nowrap rounded-full border px-4 py-2 text-xs font-bold transition ${
                        !selectedCategory
                          ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                          : "border-[var(--border)] bg-[var(--surface-soft)] text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
                      }`}
                    >
                      Semua
                    </Link>
                    {categories.map((category) => (
                      <Link
                        key={category}
                        href={buildCoursesHref({ category, search: searchKeyword, skill: selectedSkill })}
                        className={`whitespace-nowrap rounded-full border px-4 py-2 text-xs font-bold transition ${
                          selectedCategory === category
                            ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                            : "border-[var(--border)] bg-[var(--surface-soft)] text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
                        }`}
                      >
                        {category}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}

              {skills.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                    Skill
                  </p>
                  <div className="native-horizontal-scroll flex gap-2 overflow-x-auto pb-1">
                    <Link
                      href={buildCoursesHref({ category: selectedCategory, search: searchKeyword })}
                      className={`whitespace-nowrap rounded-full border px-4 py-2 text-xs font-bold transition ${
                        !selectedSkill
                          ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                          : "border-[var(--border)] bg-[var(--surface-soft)] text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
                      }`}
                    >
                      Semua Skill
                    </Link>
                    {skills.map((skill) => {
                      const skillKey = skill.slug || String(skill.id);

                      return (
                        <Link
                          key={skillKey}
                          href={buildCoursesHref({
                            category: selectedCategory,
                            search: searchKeyword,
                            skill: skillKey,
                          })}
                          className={`whitespace-nowrap rounded-full border px-4 py-2 text-xs font-bold transition ${
                            selectedSkill === skillKey
                              ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                              : "border-[var(--border)] bg-[var(--surface-soft)] text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
                          }`}
                        >
                          {skill.name}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {hasActiveFilters ? (
                <Link
                  href="/courses"
                  className="inline-flex h-8 items-center rounded-full border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-bold text-[var(--muted-foreground)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
                >
                  Reset filter
                </Link>
              ) : null}
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
                {hasActiveFilters ? "Course tidak ditemukan" : "Belum ada course tersedia"}
              </p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Coba ubah kata kunci, kategori, atau skill.
              </p>
            </div>
          </div>
        ) : null}

        {!isLoading && !isError ? (
          <div className="grid grid-cols-1 items-start gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visibleCourses.map((course) => (
              <CourseCatalogCard
                key={course.id}
                actionLabel={user ? "Checkout" : "Masuk"}
                course={course}
                detailHref={`/courses/${course.slug}`}
                onAction={() => handleStartCheckout(course.slug)}
              />
            ))}
          </div>
        ) : null}
      </main>

      <SiteFooter settings={websiteSettings} className="mt-12" />
    </div>
  );
}
