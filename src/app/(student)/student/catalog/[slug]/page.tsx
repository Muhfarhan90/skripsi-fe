"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
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
import { getPublishedCourseBySlug, getStudentCourseReviews } from "@/features/student/api/store-api";
import { buildStudentCheckoutPath } from "@/features/student/lib/checkout";
import { formatUtcDateTimeToJakarta } from "@/features/student/lib/date-time";
import { hasValidDiscount } from "@/features/student/lib/pricing";
import { getCourseInstructorHref } from "@/features/website/lib/public-instructors";
import { resolvePublicFileUrl } from "@/lib/file-url";
import type { StoreCourse } from "@/types/store";

function formatCurrency(amount: number | null | undefined): string {
  const value = Number(amount ?? 0);
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
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

type CurriculumSection = NonNullable<StoreCourse["sections"]>[number];

export default function StudentCatalogDetailPage() {
  const params = useParams<{ slug: string }>();
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
  const reviewCount = Number(course.reviews_count ?? 0);
  const instructorHref = getCourseInstructorHref(course);

  return (
    <div className="space-y-6 pb-24 md:pb-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm sm:p-6 lg:p-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_23rem]">
          <div className="space-y-5">
            <Link
              href="/student/catalog"
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
                <h1 className="text-3xl font-black leading-[1.15] tracking-tight text-[var(--foreground)] sm:text-4xl">
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

          <aside className="hidden lg:block">
            <StudentPurchasePanel
              slug={course.slug}
              price={course.price}
              activePrice={activePrice}
              hasDiscount={hasDiscount}
            />
          </aside>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_23rem]">
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

          <div className="space-y-6 lg:hidden">
            <ReviewSummaryCard reviewAverage={course.reviews_avg_rating} reviewCount={reviewCount} />
          </div>

          <ContentSection title="Review peserta">
            <div className="space-y-4">
              {reviewsQuery.isLoading ? (
                <p className="text-sm text-[var(--muted-foreground)]">Memuat review kelas...</p>
              ) : null}

              {reviewsQuery.isError ? (
                <p className="text-sm text-red-600">Review kelas belum bisa dimuat.</p>
              ) : null}

              {!reviewsQuery.isLoading && !reviewsQuery.isError && reviews.length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)]">Belum ada review untuk course ini.</p>
              ) : null}

              <div className="grid gap-4 xl:grid-cols-2">
                {reviews.map((review) => {
                  const reviewerName = review.user?.fullname || "Student";
                  const avatarUrl = resolveReviewAvatar(review.user?.avatar);

                  return (
                    <article key={review.id} className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface-soft)] p-5">
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
                            <p className="font-semibold text-[var(--foreground)]">{reviewerName}</p>
                            <div className="mt-2">{renderStars(review.rating)}</div>
                          </div>
                        </div>

                        <p className="text-sm text-[var(--muted-foreground)]">
                          {formatUtcDateTimeToJakarta(review.created_at)}
                        </p>
                      </div>

                      <p className="mt-4 text-sm leading-7 text-[var(--muted-foreground)]">
                        {review.review || "Student memberikan rating tanpa komentar tambahan."}
                      </p>
                    </article>
                  );
                })}
              </div>
            </div>
          </ContentSection>
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-6">
            <StudentPurchasePanel
              slug={course.slug}
              price={course.price}
              activePrice={activePrice}
              hasDiscount={hasDiscount}
            />

            <ReviewSummaryCard reviewAverage={course.reviews_avg_rating} reviewCount={reviewCount} />
          </div>
        </aside>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--card)] px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-10px_28px_rgba(15,23,42,0.08)] md:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            {hasDiscount ? (
              <p className="text-xs text-[var(--muted-foreground)] line-through">{formatCurrency(course.price)}</p>
            ) : null}
            <p className="truncate text-lg font-semibold text-[var(--primary)]">{formatCurrency(activePrice)}</p>
          </div>
          <Link
            href={buildStudentCheckoutPath(course.slug)}
            className="inline-flex h-11 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)] px-5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Checkout
          </Link>
        </div>
      </div>
    </div>
  );
}

function StudentPurchasePanel({
  slug,
  price,
  activePrice,
  hasDiscount,
}: {
  slug: string;
  price: number | null;
  activePrice: number;
  hasDiscount: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
      <div className="space-y-5 p-6">
        <div>
          {hasDiscount ? (
            <p className="mb-0.5 text-xs font-semibold text-[var(--muted-foreground)] line-through">{formatCurrency(price)}</p>
          ) : null}
          <p className="text-3xl font-black text-[var(--primary)]">{formatCurrency(activePrice)}</p>
        </div>

        <div className="grid gap-2">
          <Link
            href={buildStudentCheckoutPath(slug)}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-6 text-sm font-extrabold text-white shadow-lg shadow-emerald-950/10 transition hover:-translate-y-0.5 hover:shadow-xl active:scale-95"
          >
            <CreditCard className="size-4" />
            Checkout Sekarang
          </Link>
          <Link
            href="/student/orders"
            className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-6 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-hover)]"
          >
            Lihat Order Saya
          </Link>
        </div>

        <div className="space-y-2.5 border-t border-[var(--border)]/65 pt-4 text-xs font-medium text-[var(--muted-foreground)]">
          <p className="flex items-center gap-2.5">
            <CheckCircle2 className="size-4 text-[var(--primary)]" />
            Akses materi setelah pembayaran berhasil.
          </p>
          <p className="flex items-center gap-2.5">
            <CheckCircle2 className="size-4 text-[var(--primary)]" />
            Riwayat order tetap bisa dipantau dari dashboard student.
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
            <div key={section.id}>
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

function ReviewSummaryCard({
  reviewAverage,
  reviewCount,
}: {
  reviewAverage: number | null | undefined;
  reviewCount: number;
}) {
  const averageLabel = formatReviewAverage(reviewAverage);
  const hasReviews = reviewCount > 0;

  return (
    <ContentSection title="Review kelas">
      {hasReviews ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black text-[var(--foreground)]">{averageLabel}</span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((item) => (
                <Star
                  key={item}
                  className={`size-4 ${item <= Math.round(Number(reviewAverage ?? 0)) ? "fill-amber-400 text-amber-400" : "text-[var(--border)]"}`}
                />
              ))}
            </div>
          </div>
          <p className="text-sm font-semibold text-[var(--foreground)]">{reviewCount} review dari peserta</p>
          <p className="text-sm leading-6 text-[var(--muted-foreground)]">
            Penilaian ini berasal dari peserta yang sudah mengikuti course.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-[var(--foreground)]">Belum ada review</p>
          <p className="text-sm leading-6 text-[var(--muted-foreground)]">
            Review akan tampil setelah peserta memberikan penilaian untuk course ini.
          </p>
        </div>
      )}
    </ContentSection>
  );
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
