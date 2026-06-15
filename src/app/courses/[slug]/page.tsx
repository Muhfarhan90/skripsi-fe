"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  FileText,
  HelpCircle,
  Lock,
  MessageSquareText,
  Play,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { getPublicWebsiteSettings, getPublishedCourseBySlug, getStudentCourseReviews } from "@/features/student/api/store-api";
import { formatUtcDateTimeToJakarta } from "@/features/student/lib/date-time";
import {
  buildStudentCheckoutLoginRedirect,
  buildStudentCheckoutPath,
} from "@/features/student/lib/checkout";
import { hasValidDiscount } from "@/features/student/lib/pricing";
import { SiteFooter } from "@/features/website/components/site-footer";
import { PublicSiteHeader } from "@/features/website/components/public-site-header";
import { getCourseInstructorHref } from "@/features/website/lib/public-instructors";
import { resolvePublicFileUrl } from "@/lib/file-url";
import { createDefaultWebsiteSetting } from "@/features/website/lib/website-settings";
import { isStudentRole } from "@/features/auth/lib/roles";
import { useAuthStore } from "@/features/auth/store/auth-store";
import type { StoreCourse } from "@/types/store";

function formatCurrency(amount: number | null | undefined): string {
  const value = Number(amount ?? 0);
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function parseTextItems(value: string | null | undefined): string[] {
  return (value ?? "")
    .split(/\r?\n|;/)
    .map((item) => item.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);
}

function formatReviewAverage(value: number | null | undefined): string {
  const numeric = Number(value ?? 0);
  return numeric > 0 ? numeric.toFixed(1) : "0.0";
}

type CurriculumSection = NonNullable<StoreCourse["sections"]>[number];

export default function CourseDetailPage() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const user = useAuthStore((state) => state.user);
  const catalogHref = isStudentRole(user?.role_name, user?.role_id) ? "/student/catalog" : "/courses";
  const slug = typeof params.slug === "string" ? params.slug : "";

  const websiteSettingsQuery = useQuery({
    queryKey: ["public", "website-settings"],
    queryFn: getPublicWebsiteSettings,
    staleTime: 5 * 60_000,
  });
  const courseQuery = useQuery({
    queryKey: ["store", "course-detail", slug],
    queryFn: () => getPublishedCourseBySlug(slug),
    enabled: slug.length > 0,
  });

  const courseId = courseQuery.data?.id ?? null;
  const reviewsQuery = useQuery({
    queryKey: ["store", "course", courseId, "reviews"],
    queryFn: () => getStudentCourseReviews(courseId as number),
    enabled: Number.isFinite(courseId) && (courseId as number) > 0,
  });
  const reviews = reviewsQuery.data ?? [];

  const websiteSettings = websiteSettingsQuery.data ?? createDefaultWebsiteSetting();

  const handleCheckout = () => {
    const course = courseQuery.data;
    if (!course) {
      return;
    }

    if (!user) {
      router.push(buildStudentCheckoutLoginRedirect(course.slug));
      return;
    }

    if (!isStudentRole(user.role_name, user.role_id)) {
      toast.error("Fitur pembelian hanya tersedia untuk akun student");
      return;
    }

    router.push(buildStudentCheckoutPath(course.slug));
  };

  if (courseQuery.isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        <PublicSiteHeader settings={websiteSettings} />
        <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="h-8 w-40 animate-pulse rounded-md bg-[var(--border)]" />
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_21rem]">
            <div className="h-96 animate-pulse rounded-lg bg-[var(--border)]" />
            <div className="h-72 animate-pulse rounded-lg bg-[var(--border)]" />
          </div>
        </main>
        <SiteFooter settings={websiteSettings} className="mt-12" />
      </div>
    );
  }

  if (courseQuery.isError || !courseQuery.data) {
    return (
      <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        <PublicSiteHeader settings={websiteSettings} />
        <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <section className="rounded-lg border border-[var(--danger-soft-border)] bg-[var(--danger-soft-bg)] p-5 text-sm text-[var(--danger-soft-foreground)]">
            <p>Course tidak ditemukan atau gagal dimuat.</p>
            <Link href={catalogHref} className="mt-3 inline-flex items-center gap-2 font-semibold">
              <ArrowLeft className="size-4" />
              Kembali ke katalog
            </Link>
          </section>
        </main>
        <SiteFooter settings={websiteSettings} className="mt-12" />
      </div>
    );
  }

  const course = courseQuery.data;
  const hasDiscount = hasValidDiscount(course.price, course.discount_price);
  const activePrice = hasDiscount ? Number(course.discount_price ?? 0) : Number(course.price ?? 0);
  const requirements = parseTextItems(course.requirements);
  const outcomes = parseTextItems(course.outcomes);
  const reviewCount = Number(course.reviews_count ?? 0);
  const buyLabel = user ? "Beli sekarang" : "Masuk untuk beli";
  const instructorHref = getCourseInstructorHref(course);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <PublicSiteHeader settings={websiteSettings} courses={[course]} />

      <main className="pb-24 md:pb-16">
        <section className="relative overflow-hidden border-b border-[var(--border)]/70 bg-[var(--card)] py-6 lg:py-10">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-[1fr_23rem]">
            <div className="space-y-6">
              <Link
                href={catalogHref}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--border)]/60 bg-[var(--surface-soft)] px-4 py-2 text-xs font-bold text-[var(--primary)] shadow-sm transition hover:-translate-y-0.5 hover:bg-[var(--surface-hover)] active:scale-95"
              >
                <ArrowLeft className="size-3.5" />
                Kembali ke katalog
              </Link>

              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="rounded-full bg-[var(--primary)]/10 px-3.5 py-1 text-[10px] font-black uppercase tracking-wider text-[var(--primary)]">
                    {course.status}
                  </span>
                  {course.category_name ? (
                    <span className="rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-3.5 py-1 text-[10px] font-black uppercase tracking-wider text-[var(--foreground)]">
                      {course.category_name}
                    </span>
                  ) : null}
                </div>

                <div className="max-w-3xl space-y-4">
                  <h1 className="text-3xl font-black leading-[1.15] tracking-tight text-[var(--foreground)] sm:text-4xl md:text-5xl">
                    {course.title}
                  </h1>
                  <p className="max-w-2xl text-sm leading-relaxed text-[var(--muted-foreground)] sm:text-base">
                    {course.description || "Deskripsi course belum tersedia."}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2.5 text-xs font-bold text-[var(--muted-foreground)]">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)]/75 bg-[var(--surface-soft)] px-3.5 py-2">
                    <Star className="size-4 fill-amber-400 text-amber-400" />
                    <span className="text-[var(--foreground)]">{formatReviewAverage(course.reviews_avg_rating)} rating</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)]/75 bg-[var(--surface-soft)] px-3.5 py-2">
                    <MessageSquareText className="size-4 text-[var(--primary)]" />
                    <span>{reviewCount} review</span>
                  </span>
                </div>
              </div>
            </div>

            <aside className="relative z-10 hidden lg:block">
              <PurchasePanel
                thumbnail={course.thumbnail}
                title={course.title}
                hasDiscount={hasDiscount}
                price={course.price}
                activePrice={activePrice}
                checkoutLabel={buyLabel}
                onCheckout={handleCheckout}
              />
            </aside>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_23rem]">
          <div className="space-y-6">
            <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card)] lg:hidden">
              {course.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={resolvePublicFileUrl(course.thumbnail) ?? ""} alt={course.title} className="aspect-[16/8] max-h-64 w-full object-cover" />
              ) : (
                <div className="flex aspect-[16/8] max-h-64 items-center justify-center bg-[var(--surface-soft)] text-[var(--muted-foreground)]">
                  <BookOpen className="size-12" />
                </div>
              )}
            </div>

            <ContentSection title="Tentang course">
              <p className="whitespace-pre-line text-sm leading-7 text-[var(--muted-foreground)]">
                {course.description || "Deskripsi course belum tersedia."}
              </p>
            </ContentSection>

            <ContentSection title="Yang akan dipelajari">
              {outcomes.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {outcomes.map((item, index) => (
                    <InfoItem key={`${item}-${index}`} text={item} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--muted-foreground)]">Outcome belum ditambahkan.</p>
              )}
            </ContentSection>

            <ContentSection title="Materi yang akan dipelajari">
              <CurriculumAccordion sections={course.sections} />
            </ContentSection>

            <ContentSection title="Persiapan sebelum belajar">
              {requirements.length > 0 ? (
                <div className="space-y-3">
                  {requirements.map((item, index) => (
                    <InfoItem key={`${item}-${index}`} text={item} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--muted-foreground)]">
                  Tidak ada requirement khusus untuk mengikuti course ini.
                </p>
              )}
            </ContentSection>

            {course.instructor_name ? (
              <InstructorDetailCard
                instructorName={course.instructor_name}
                instructorBio={course.instructor_bio}
                instructorHref={instructorHref}
                instructorAvatar={course.instructor_avatar}
              />
            ) : null}

            {/* Review kelas (Hanya muncul di Mobile/Tablet < lg) */}
            <div className="lg:hidden">
              <ContentSection title="Review kelas">
                <div className="grid gap-6 md:grid-cols-[16rem_1fr]">
                  <ReviewSummaryBlock
                    reviewsAvgRating={course.reviews_avg_rating}
                    reviewCount={reviewCount}
                  />
                  <ReviewListBlock
                    isLoading={reviewsQuery.isLoading}
                    isError={reviewsQuery.isError}
                    reviews={reviews}
                  />
                </div>
              </ContentSection>
            </div>
          </div>

          {/* Review kelas (Hanya muncul di Desktop >= lg) */}
          <aside className="hidden lg:block space-y-6">
            <ContentSection title="Review kelas">
              <div className="space-y-6">
                <ReviewSummaryBlock
                  reviewsAvgRating={course.reviews_avg_rating}
                  reviewCount={reviewCount}
                />
                <ReviewListBlock
                  isLoading={reviewsQuery.isLoading}
                  isError={reviewsQuery.isError}
                  reviews={reviews}
                />
              </div>
            </ContentSection>
          </aside>
        </section>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--card)] px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-10px_28px_rgba(15,23,42,0.08)] md:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            {hasDiscount ? (
              <p className="text-xs text-[var(--muted-foreground)] line-through">{formatCurrency(course.price)}</p>
            ) : null}
            <p className="truncate text-lg font-semibold text-[var(--primary)]">{formatCurrency(activePrice)}</p>
          </div>
          <button
            type="button"
            onClick={handleCheckout}
            className="inline-flex h-11 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)] px-5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-70"
          >
            {buyLabel}
          </button>
        </div>
      </div>

      <SiteFooter settings={websiteSettings} />
    </div>
  );
}

function PurchasePanel({
  thumbnail,
  title,
  hasDiscount,
  price,
  activePrice,
  checkoutLabel,
  onCheckout,
}: {
  thumbnail: string | null;
  title: string;
  hasDiscount: boolean;
  price: number | null;
  activePrice: number;
  checkoutLabel: string;
  onCheckout: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
      <div className="relative aspect-[16/9] overflow-hidden">
        {thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={resolvePublicFileUrl(thumbnail) ?? ""} alt={title} className="h-full w-full object-cover transition-transform duration-500 hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[var(--surface-soft)] text-[var(--muted-foreground)]">
            <BookOpen className="size-12" />
          </div>
        )}
      </div>

      <div className="space-y-5 p-6">
        <div>
          {hasDiscount ? (
            <p className="mb-0.5 text-xs font-semibold text-[var(--muted-foreground)] line-through">{formatCurrency(price)}</p>
          ) : null}
          <p className="text-3xl font-black text-[var(--primary)]">{formatCurrency(activePrice)}</p>
        </div>

        <div className="grid gap-2">
          <button
            type="button"
            onClick={onCheckout}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-6 text-sm font-extrabold text-white shadow-lg shadow-emerald-950/10 transition hover:-translate-y-0.5 hover:shadow-xl active:scale-95 disabled:opacity-70"
          >
            <CreditCard className="size-4" />
            {checkoutLabel}
          </button>
        </div>

        <div className="space-y-2.5 border-t border-[var(--border)]/65 pt-4 text-xs font-medium text-[var(--muted-foreground)]">
          <p className="flex items-center gap-2.5">
            <CheckCircle2 className="size-4 text-[var(--primary)]" />
            Akses materi setelah pembayaran berhasil.
          </p>
          <p className="flex items-center gap-2.5">
            <CheckCircle2 className="size-4 text-[var(--primary)]" />
            Sertifikat tersedia jika syarat course selesai.
          </p>
        </div>
      </div>
    </div>
  );
}

function CurriculumAccordion({ sections = [] }: { sections?: CurriculumSection[] }) {
  const [expandedSections, setExpandedSections] = useState<Record<number, boolean>>(() => {
    if (sections.length > 0) {
      return { [sections[0].id]: true };
    }

    return {};
  });

  const toggleSection = (sectionId: number) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  if (sections.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-6 text-center text-sm text-[var(--muted-foreground)]">
        Kurikulum belum tersedia untuk course ini.
      </div>
    );
  }

  const totalLessons = sections.reduce((acc, section) => acc + (section.lessons?.length || 0), 0);
  const totalQuizzes = sections.reduce((acc, section) => acc + (section.quizzes?.length || 0), 0);
  const totalAssignments = sections.reduce((acc, section) => acc + (section.assignments?.length || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)]/45 pb-3 text-xs font-semibold text-[var(--muted-foreground)]">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <span>{sections.length} Section</span>
          <span>|</span>
          <span>{totalLessons} Lesson</span>
          {totalQuizzes > 0 ? (
            <>
              <span>|</span>
              <span>{totalQuizzes} Kuis</span>
            </>
          ) : null}
          {totalAssignments > 0 ? (
            <>
              <span>|</span>
              <span>{totalAssignments} Tugas</span>
            </>
          ) : null}
        </div>
      </div>

      <div className="divide-y divide-[var(--border)]/45 overflow-hidden rounded-2xl border border-[var(--border)]/70 bg-[var(--card)] shadow-sm">
        {sections.map((section, idx) => {
          const isExpanded = expandedSections[section.id];
          const itemsCount =
            (section.lessons?.length || 0) +
            (section.quizzes?.length || 0) +
            (section.assignments?.length || 0);

          return (
            <div key={section.id} className="group/section">
              <button
                type="button"
                onClick={() => toggleSection(section.id)}
                className="flex w-full items-center justify-between bg-[var(--surface-soft)]/45 px-5 py-4 text-left transition hover:bg-[var(--surface-soft)]/80"
              >
                <div className="min-w-0 pr-4">
                  <span className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-[var(--primary)]">
                    Bagian {idx + 1}
                  </span>
                  <span className="block text-sm font-extrabold leading-snug text-[var(--foreground)] sm:text-base">
                    {section.title}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="hidden text-xs font-semibold text-[var(--muted-foreground)] sm:inline">
                    {itemsCount} materi
                  </span>
                  <span
                    className={`inline-flex size-7 items-center justify-center rounded-full border border-[var(--border)]/65 bg-[var(--card)] text-[var(--foreground)] shadow-sm transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
                  >
                    <ChevronDown className="size-4" />
                  </span>
                </div>
              </button>

              {isExpanded ? (
                <div className="divide-y divide-[var(--border)]/30 bg-[var(--card)]">
                  {section.lessons?.map((lesson) => (
                    <div key={lesson.id} className="flex flex-col gap-3 px-4 py-3.5 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
                      <div className="flex min-w-0 items-start gap-3">
                        <Play className="mt-0.5 size-4 shrink-0 fill-[var(--primary)]/10 text-[var(--primary)]" />
                        <div className="min-w-0">
                          <span className="block font-semibold leading-snug text-[var(--foreground)] sm:truncate">
                            {lesson.title}
                          </span>
                          {lesson.description ? (
                            <span className="mt-0.5 block max-w-md text-xs leading-5 text-[var(--muted-foreground)] sm:truncate">
                              {lesson.description}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-3 pl-7 sm:pl-0">
                        {lesson.is_preview ? (
                          <span className="rounded-full bg-[var(--primary)]/10 px-2.5 py-0.5 text-[10px] font-black text-[var(--primary)]">
                            Preview
                          </span>
                        ) : (
                          <Lock className="size-3.5 text-[var(--muted-foreground)]/60" />
                        )}
                        {lesson.duration ? (
                          <span className="text-xs font-medium text-[var(--muted-foreground)]">{lesson.duration} mnt</span>
                        ) : null}
                      </div>
                    </div>
                  ))}

                  {section.quizzes?.map((quiz) => (
                    <div key={quiz.id} className="flex flex-col gap-3 bg-amber-500/[0.02] px-4 py-3.5 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
                      <div className="flex min-w-0 items-start gap-3">
                        <HelpCircle className="mt-0.5 size-4 shrink-0 text-amber-500" />
                        <div className="min-w-0">
                          <span className="block font-semibold leading-snug text-[var(--foreground)] sm:truncate">
                            {quiz.title} (Kuis)
                          </span>
                          {quiz.passing_score ? (
                            <span className="mt-0.5 block text-xs text-[var(--muted-foreground)]">
                              Passing score: {quiz.passing_score}%
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2 pl-7 sm:pl-0">
                        <Lock className="size-3.5 text-[var(--muted-foreground)]/60" />
                        {quiz.duration ? (
                          <span className="text-xs font-medium text-[var(--muted-foreground)]">{quiz.duration} mnt</span>
                        ) : null}
                      </div>
                    </div>
                  ))}

                  {section.assignments?.map((assignment) => (
                    <div key={assignment.id} className="flex flex-col gap-3 bg-rose-500/[0.02] px-4 py-3.5 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
                      <div className="flex min-w-0 items-start gap-3">
                        <FileText className="mt-0.5 size-4 shrink-0 text-rose-500" />
                        <div className="min-w-0">
                          <span className="block font-semibold leading-snug text-[var(--foreground)] sm:truncate">
                            {assignment.title} (Tugas Mandiri)
                          </span>
                          {assignment.is_required_for_certificate ? (
                            <span className="mt-0.5 block text-xs font-medium text-rose-500">
                              Wajib untuk sertifikat
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2 pl-7 sm:pl-0">
                        <Lock className="size-3.5 text-[var(--muted-foreground)]/60" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ContentSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm sm:p-6">
      <h2 className="text-lg font-extrabold text-[var(--foreground)]">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function InfoItem({ text }: { text: string }) {
  return (
    <div className="flex gap-3 rounded-xl border border-[var(--border)]/60 bg-[var(--surface-soft)] p-3.5 text-sm text-[var(--foreground)]">
      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[var(--primary)]" />
      <span className="leading-6">{text}</span>
    </div>
  );
}

function InstructorDetailCard({
  instructorName,
  instructorBio,
  instructorHref,
  instructorAvatar,
}: {
  instructorName: string;
  instructorBio: string | null | undefined;
  instructorHref: string | null;
  instructorAvatar?: string | null;
}) {
  const resolvedAvatar = instructorAvatar ? resolvePublicFileUrl(instructorAvatar) : null;
  return (
    <ContentSection title="Instruktur">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
        <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--border)] bg-[var(--surface-soft)]">
          {resolvedAvatar ? (
            <img
              src={resolvedAvatar}
              alt={instructorName}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-xl font-bold text-[var(--muted-foreground)]">
              {instructorName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          {instructorHref ? (
            <Link
              href={instructorHref}
              className="inline-flex text-base font-extrabold text-[var(--foreground)] transition hover:text-[var(--primary)]"
            >
              {instructorName}
            </Link>
          ) : (
            <p className="text-base font-extrabold text-[var(--foreground)]">{instructorName}</p>
          )}
          <p className="text-sm leading-7 text-[var(--muted-foreground)]">
            {instructorBio?.trim() || "Bio instruktur belum tersedia."}
          </p>
        </div>
      </div>
    </ContentSection>
  );
}

interface ReviewSummaryBlockProps {
  reviewsAvgRating: number | null | undefined;
  reviewCount: number;
}

function ReviewSummaryBlock({
  reviewsAvgRating,
  reviewCount,
}: ReviewSummaryBlockProps) {
  return (
    <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-5 h-fit">
      <div className="flex items-center gap-3">
        <span className="text-3xl font-black text-[var(--foreground)]">
          {formatReviewAverage(reviewsAvgRating)}
        </span>
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((item) => (
            <Star
              key={item}
              className={`size-4 ${item <= Math.round(Number(reviewsAvgRating ?? 0)) ? "fill-amber-400 text-amber-400" : "text-[var(--border)]"}`}
            />
          ))}
        </div>
      </div>
      <div>
        <p className="text-sm font-bold text-[var(--foreground)]">{reviewCount} review dari peserta</p>
        <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">
          Penilaian ini berasal dari peserta yang sudah mengikuti course.
        </p>
      </div>
    </div>
  );
}

interface ReviewListBlockProps {
  isLoading: boolean;
  isError: boolean;
  reviews: any[];
}

function ReviewListBlock({
  isLoading,
  isError,
  reviews,
}: ReviewListBlockProps) {
  return (
    <div className="space-y-4">
      {isLoading ? (
        <p className="text-sm text-[var(--muted-foreground)]">Memuat review kelas...</p>
      ) : null}

      {isError ? (
        <p className="text-sm text-red-600">Review kelas belum bisa dimuat.</p>
      ) : null}

      {!isLoading && !isError && reviews.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">Belum ada review untuk course ini.</p>
      ) : null}

      <div className="space-y-4">
        {reviews.map((review) => {
          const reviewerName = review.user?.fullname || "Student";
          const avatarUrl = resolveReviewAvatar(review.user?.avatar);

          return (
            <article key={review.id} className="rounded-2xl border border-[var(--border)] p-4 bg-[var(--card)] shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--primary)]/10 text-xs font-semibold text-[var(--primary)]">
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatarUrl}
                        alt={reviewerName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      getReviewAvatarLabel(reviewerName)
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-bold text-[var(--foreground)]">{reviewerName}</p>
                    <div className="mt-1">{renderStars(review.rating)}</div>
                  </div>
                </div>

                <p className="text-xs text-[var(--muted-foreground)]">
                  {formatUtcDateTimeToJakarta(review.created_at)}
                </p>
              </div>

              <p className="mt-3 text-xs leading-5 text-[var(--muted-foreground)]">
                {review.review || "Student memberikan rating tanpa komentar tambahan."}
              </p>
            </article>
          );
        })}
      </div>
    </div>
  );
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
