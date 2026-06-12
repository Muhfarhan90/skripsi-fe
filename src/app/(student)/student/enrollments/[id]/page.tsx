"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  ChevronDown,
  FileText,
  HelpCircle,
  Lock,
  MessageSquareText,
  Play,
} from "lucide-react";
import {
  getStudentEnrollmentById,
  getStudentEnrollmentCertificate,
  getStudentEnrollmentCurriculum,
  getStudentEnrollmentNextLesson,
  getStudentEnrollmentProgressSummary,
} from "@/features/student/api/store-api";
import {
  formatRemainingAccessTime,
  formatUtcDateTimeToJakarta,
} from "@/features/student/lib/date-time";
import { getCourseInstructorHref } from "@/features/website/lib/public-instructors";
import type { StoreCourse } from "@/types/store";

function toPercent(value: number | null | undefined): string {
  return `${Math.max(0, Math.min(100, Number(value ?? 0)))}%`;
}

function toProgressValue(value: number | null | undefined): number {
  return Math.max(0, Math.min(100, Number(value ?? 0)));
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
      // fall through to text split parsing
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

type CurriculumSection = NonNullable<StoreCourse["sections"]>[number];

export default function StudentEnrollmentDetailPage() {
  const params = useParams<{ id: string }>();
  const enrollmentId = Number(params.id);

  const enrollmentQuery = useQuery({
    queryKey: ["student", "enrollment", enrollmentId],
    queryFn: () => getStudentEnrollmentById(enrollmentId),
    enabled: Number.isFinite(enrollmentId) && enrollmentId > 0,
  });

  const summaryQuery = useQuery({
    queryKey: ["student", "enrollment", enrollmentId, "summary"],
    queryFn: () => getStudentEnrollmentProgressSummary(enrollmentId),
    enabled: Number.isFinite(enrollmentId) && enrollmentId > 0,
  });

  const nextLessonQuery = useQuery({
    queryKey: ["student", "enrollment", enrollmentId, "next-lesson"],
    queryFn: () => getStudentEnrollmentNextLesson(enrollmentId),
    enabled: Number.isFinite(enrollmentId) && enrollmentId > 0,
  });

  const certificateQuery = useQuery({
    queryKey: ["student", "enrollment", enrollmentId, "certificate"],
    queryFn: () => getStudentEnrollmentCertificate(enrollmentId),
    enabled: Number.isFinite(enrollmentId) && enrollmentId > 0,
  });

  const curriculumQuery = useQuery({
    queryKey: ["student", "enrollment", enrollmentId, "curriculum"],
    queryFn: () => getStudentEnrollmentCurriculum(enrollmentId),
    enabled: Number.isFinite(enrollmentId) && enrollmentId > 0,
  });

  if (enrollmentQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Memuat detail kelas...</p>;
  }

  if (enrollmentQuery.isError || !enrollmentQuery.data) {
    return <p className="text-sm text-red-600">Kelas tidak ditemukan.</p>;
  }

  const enrollment = enrollmentQuery.data;
  const course = enrollment.course;
  const summary = summaryQuery.data;
  const nextLesson = nextLessonQuery.data;
  const curriculumSections = curriculumQuery.data?.sections ?? course?.sections ?? [];
  const progressValue = toProgressValue(summary?.progress ?? enrollment.progress);
  const requirementItems = parseTextItems(course?.requirements);
  const outcomeItems = parseTextItems(course?.outcomes);
  const descriptionText = course?.description?.trim() || "Deskripsi kelas belum tersedia.";
  const assignmentRequirement = summary?.assignment_requirement;
  const accessEndAt = summary?.ended_at ?? enrollment.ended_at ?? enrollment.expired_at;
  const certificate = certificateQuery.data;
  const hasCertificate = summary?.has_certificate ?? enrollment.has_certificate ?? Boolean(certificate);
  const isProgressComplete = progressValue >= 100;
  const learnHref = isProgressComplete
    ? `/student/enrollments/${enrollment.id}/learn?panel=certificate`
    : `/student/enrollments/${enrollment.id}/learn`;
  const primaryActionLabel = isProgressComplete ? "Lihat Sertifikat" : "Lanjut Belajar";
  const certificateStatus = hasCertificate
    ? "Sertifikat tersedia"
    : !isProgressComplete
      ? "Belum tersedia"
      : assignmentRequirement && !assignmentRequirement.is_satisfied
        ? "Menunggu approval assignment"
        : certificateQuery.isLoading
          ? "Sertifikat sedang disiapkan"
          : "Belum tersedia";
  const instructorHref = course ? getCourseInstructorHref(course) : null;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[radial-gradient(circle_at_top_right,rgba(15,122,90,0.06),transparent_45%),radial-gradient(circle_at_bottom_left,rgba(217,175,0,0.04),transparent_35%)] bg-[var(--card)] p-5 shadow-sm sm:p-6 lg:p-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_23rem]">
          <div className="space-y-5">
            <Link
              href="/student/enrollments"
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border)]/60 bg-white/70 px-4 py-2 text-xs font-bold text-[var(--primary)] shadow-sm transition hover:-translate-y-0.5 hover:bg-white active:scale-95"
            >
              <ArrowLeft className="size-3.5" />
              Kembali ke kelas saya
            </Link>

            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="rounded-full bg-[var(--primary)]/10 px-3.5 py-1 text-[10px] font-black uppercase tracking-wider text-[var(--primary)]">
                  {enrollment.status}
                </span>
                {course?.category_name ? (
                  <span className="rounded-full border border-[var(--border)] bg-white/70 px-3.5 py-1 text-[10px] font-black uppercase tracking-wider text-[var(--foreground)]">
                    {course.category_name}
                  </span>
                ) : null}
              </div>

              <div className="max-w-3xl space-y-4">
                <h1 className="text-3xl font-black leading-[1.15] tracking-tight text-[var(--foreground)] sm:text-4xl">
                  {course?.title ?? `Course #${enrollment.course_id}`}
                </h1>
                <p className="max-w-2xl text-sm leading-relaxed text-[var(--muted-foreground)] sm:text-base">
                  {descriptionText}
                </p>
              </div>

              <div className="flex flex-wrap gap-2.5 text-xs font-bold text-[var(--muted-foreground)]">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)]/75 bg-white/60 px-3.5 py-2">
                  <CheckCircle2 className="size-4 text-[var(--primary)]" />
                  <span className="text-[var(--foreground)]">{toPercent(progressValue)} progress</span>
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)]/75 bg-white/60 px-3.5 py-2">
                  <MessageSquareText className="size-4 text-[var(--primary)]" />
                  <span>{summary?.completed_lessons ?? 0} lesson selesai</span>
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)]/75 bg-white/60 px-3.5 py-2">
                  <Award className="size-4 text-[var(--primary)]" />
                  <span>{certificateStatus}</span>
                </span>
              </div>
            </div>
          </div>

          <aside className="hidden lg:block">
            <EnrollmentActionPanel
              accessEndAt={accessEndAt}
              certificateStatus={certificateStatus}
              learnHref={learnHref}
              nextLessonTitle={nextLesson?.title ?? null}
              primaryActionLabel={primaryActionLabel}
              progressValue={progressValue}
            />
          </aside>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_23rem]">
        <div className="space-y-6">
          <ContentSection title="Tentang kelas">
            <p className="whitespace-pre-line text-sm leading-7 text-[var(--muted-foreground)]">
              {descriptionText}
            </p>
          </ContentSection>

          <ContentSection title="Yang akan dipelajari">
            {outcomeItems.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {outcomeItems.map((item, index) => (
                  <InfoItem key={`${item}-${index}`} text={item} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--muted-foreground)]">Outcome belum ditambahkan.</p>
            )}
          </ContentSection>

          <ContentSection title="Materi kelas">
            <CurriculumAccordion
              sections={curriculumSections}
              isLoading={curriculumQuery.isLoading && curriculumSections.length === 0}
            />
          </ContentSection>

          <ContentSection title="Persiapan sebelum belajar">
            {requirementItems.length > 0 ? (
              <div className="space-y-3">
                {requirementItems.map((item, index) => (
                  <InfoItem key={`${item}-${index}`} text={item} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--muted-foreground)]">
                Tidak ada requirement khusus untuk mengikuti kelas ini.
              </p>
            )}
          </ContentSection>

          <div className="space-y-6 lg:hidden">
            <EnrollmentActionPanel
              accessEndAt={accessEndAt}
              certificateStatus={certificateStatus}
              learnHref={learnHref}
              nextLessonTitle={nextLesson?.title ?? null}
              primaryActionLabel={primaryActionLabel}
              progressValue={progressValue}
            />
            <DiscussionForumCard enrollmentId={enrollment.id} />
            {course?.instructor_name ? (
              <InstructorDetailCard
                instructorName={course.instructor_name}
                instructorBio={course.instructor_bio}
                instructorHref={instructorHref}
              />
            ) : null}
            <EnrollmentSummaryCard
              accessEndAt={accessEndAt}
              assignmentRequirement={assignmentRequirement}
              certificate={certificate ?? null}
              certificateStatus={certificateStatus}
              progressValue={progressValue}
              summary={summary}
            />
          </div>
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-6">
            <DiscussionForumCard enrollmentId={enrollment.id} />

            {course?.instructor_name ? (
              <InstructorDetailCard
                instructorName={course.instructor_name}
                instructorBio={course.instructor_bio}
                instructorHref={instructorHref}
              />
            ) : null}

            <EnrollmentSummaryCard
              accessEndAt={accessEndAt}
              assignmentRequirement={assignmentRequirement}
              certificate={certificate ?? null}
              certificateStatus={certificateStatus}
              progressValue={progressValue}
              summary={summary}
            />
          </div>
        </aside>
      </section>
    </div>
  );
}

function EnrollmentActionPanel({
  accessEndAt,
  certificateStatus,
  learnHref,
  nextLessonTitle,
  primaryActionLabel,
  progressValue,
}: {
  accessEndAt: string | null | undefined;
  certificateStatus: string;
  learnHref: string;
  nextLessonTitle: string | null;
  primaryActionLabel: string;
  progressValue: number;
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
      <div className="space-y-5 p-6">
        <div>
          <p className="text-sm font-bold text-[var(--foreground)]">Lanjutkan belajar</p>
          <p className="mt-2 text-3xl font-black text-[var(--primary)]">{toPercent(progressValue)}</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[var(--muted-foreground)]">Progress kelas</span>
            <span className="font-semibold text-[var(--foreground)]">{toPercent(progressValue)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-soft)]">
            <div
              className="h-full rounded-full bg-[var(--primary)]"
              style={{ width: `${progressValue}%` }}
            />
          </div>
        </div>

        <div className="space-y-2.5 border-t border-[var(--border)]/65 pt-4 text-xs font-medium text-[var(--muted-foreground)]">
          {nextLessonTitle ? (
            <p className="flex items-start gap-2.5">
              <Play className="mt-0.5 size-4 shrink-0 text-[var(--primary)]" />
              <span>Berikutnya: {nextLessonTitle}</span>
            </p>
          ) : null}
          <p className="flex items-start gap-2.5">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[var(--primary)]" />
            <span>Sisa akses: {formatRemainingAccessTime(accessEndAt)}</span>
          </p>
          <p className="flex items-start gap-2.5">
            <Award className="mt-0.5 size-4 shrink-0 text-[var(--primary)]" />
            <span>{certificateStatus}</span>
          </p>
        </div>

        <Link
          href={learnHref}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-6 text-sm font-extrabold text-white shadow-lg shadow-emerald-950/10 transition hover:-translate-y-0.5 hover:shadow-xl active:scale-95"
        >
          {primaryActionLabel}
        </Link>
      </div>
    </div>
  );
}

function EnrollmentSummaryCard({
  accessEndAt,
  assignmentRequirement,
  certificate,
  certificateStatus,
  progressValue,
  summary,
}: {
  accessEndAt: string | null | undefined;
  assignmentRequirement: Awaited<ReturnType<typeof getStudentEnrollmentProgressSummary>>["assignment_requirement"] | undefined;
  certificate: Awaited<ReturnType<typeof getStudentEnrollmentCertificate>>;
  certificateStatus: string;
  progressValue: number;
  summary: Awaited<ReturnType<typeof getStudentEnrollmentProgressSummary>> | undefined;
}) {
  return (
    <ContentSection title="Ringkasan belajar">
      <div className="space-y-3 text-sm">
        <InfoRow label="Progress" value={toPercent(progressValue)} />
        <InfoRow label="Total lesson" value={String(summary?.total_lessons ?? "-")} />
        <InfoRow label="Lesson selesai" value={String(summary?.completed_lessons ?? "-")} />
        <InfoRow label="Sisa akses" value={formatRemainingAccessTime(accessEndAt)} />
        <InfoRow label="Sertifikat" value={certificateStatus} />
        <InfoRow
          label="Assignment wajib"
          value={
            assignmentRequirement
              ? `${assignmentRequirement.approved_assignments} / ${assignmentRequirement.required_assignments}`
              : "-"
          }
        />
        {certificate ? (
          <>
            <InfoRow label="Nomor sertifikat" value={certificate.certificate_number} />
            <InfoRow
              label="Diterbitkan"
              value={certificate.issued_at ? formatUtcDateTimeToJakarta(certificate.issued_at) : "-"}
            />
          </>
        ) : null}
      </div>
    </ContentSection>
  );
}

function DiscussionForumCard({ enrollmentId }: { enrollmentId: number }) {
  return (
    <ContentSection title="Diskusi course">
      <div className="space-y-4">
        <p className="text-sm leading-7 text-[var(--muted-foreground)]">
          Masuk ke forum diskusi untuk bertanya, membaca insight peserta lain, dan mengikuti pembahasan materi course.
        </p>
        <Link
          href={`/student/enrollments/${enrollmentId}/learn?tab=forum`}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-5 text-sm font-extrabold text-[var(--foreground)] transition hover:-translate-y-0.5 hover:bg-[var(--surface-hover)] active:scale-95"
        >
          <MessageSquareText className="size-4 text-[var(--primary)]" />
          Buka forum diskusi
        </Link>
      </div>
    </ContentSection>
  );
}

function CurriculumAccordion({
  sections = [],
  isLoading = false,
}: {
  sections?: CurriculumSection[];
  isLoading?: boolean;
}) {
  const [expandedSections, setExpandedSections] = useState<Record<number, boolean>>({});
  const derivedExpandedSections =
    Object.keys(expandedSections).length > 0 || sections.length === 0
      ? expandedSections
      : { [sections[0].id]: true };

  const toggleSection = (sectionId: number) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-6 text-center text-sm text-[var(--muted-foreground)]">
        Memuat daftar materi kelas...
      </div>
    );
  }

  if (sections.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-6 text-center text-sm text-[var(--muted-foreground)]">
        Kurikulum belum tersedia untuk kelas ini.
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
          const isExpanded = derivedExpandedSections[section.id];
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
                    className={`inline-flex size-7 items-center justify-center rounded-full border border-[var(--border)]/65 bg-white text-[var(--foreground)] shadow-sm transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
                  >
                    <ChevronDown className="size-4" />
                  </span>
                </div>
              </button>

              {isExpanded ? (
                <div className="divide-y divide-[var(--border)]/30 bg-white/50">
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="font-medium text-[var(--muted-foreground)]">{label}</dt>
      <dd className="text-right font-bold text-[var(--foreground)]">{value}</dd>
    </div>
  );
}

function InstructorDetailCard({
  instructorName,
  instructorBio,
  instructorHref,
}: {
  instructorName: string;
  instructorBio: string | null | undefined;
  instructorHref: string | null;
}) {
  return (
    <ContentSection title="Instruktur">
      <div className="space-y-3">
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
    </ContentSection>
  );
}
