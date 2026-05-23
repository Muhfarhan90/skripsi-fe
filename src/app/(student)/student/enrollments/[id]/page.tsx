"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Award, BookText, GraduationCap, ListChecks, Tags, UserRound } from "lucide-react";
import {
  getStudentEnrollmentById,
  getStudentEnrollmentCertificate,
  getStudentEnrollmentNextLesson,
  getStudentEnrollmentProgressSummary,
} from "@/features/student/api/store-api";
import {
  formatRemainingAccessTime,
  formatUtcDateTimeToJakarta,
} from "@/features/student/lib/date-time";

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

  return (
    <section className="space-y-4 sm:space-y-5">
      <header className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
        <div className="grid gap-4 bg-[linear-gradient(120deg,#10201c,#1b2d29)] p-4 sm:gap-6 sm:p-6 lg:grid-cols-[1fr_360px]">
          <div>
            <p className="text-xs text-zinc-300">Kelas #{enrollment.id}</p>
            <h1 className="mt-2 text-2xl font-semibold leading-tight text-white sm:text-3xl lg:text-4xl">
              {course?.title ?? `Course #${enrollment.course_id}`}
            </h1>
            <p className="mt-2 max-w-4xl text-sm leading-relaxed text-zinc-200 sm:mt-3 sm:text-base lg:text-lg">
              {descriptionText}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-zinc-200 sm:mt-5 sm:gap-3 sm:text-sm">
              {course?.instructor_name ? (
                <span className="inline-flex items-center gap-1.5 rounded-md bg-white/10 px-2.5 py-1.5 sm:gap-2 sm:px-3">
                  <UserRound className="size-3.5 sm:size-4" />
                  {course.instructor_name}
                </span>
              ) : null}
              {course?.category_name ? (
                <span className="inline-flex items-center gap-1.5 rounded-md bg-white/10 px-2.5 py-1.5 sm:gap-2 sm:px-3">
                  <Tags className="size-3.5 sm:size-4" />
                  {course.category_name}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1.5 rounded-md bg-white/10 px-2.5 py-1.5 sm:gap-2 sm:px-3">
                <GraduationCap className="size-3.5 sm:size-4" />
                Status: {enrollment.status}
              </span>
            </div>
          </div>

          <aside className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 text-[var(--foreground)] shadow-sm sm:p-5">
            <h2 className="text-2xl font-semibold sm:text-3xl">Lanjutkan Belajar</h2>
            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-[var(--muted-foreground)]">Progress belajar</span>
                <span className="font-semibold">{toPercent(progressValue)}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--muted)]">
                <div className="h-full rounded-full bg-[var(--secondary)]" style={{ width: `${progressValue}%` }} />
              </div>
            </div>

            {nextLessonQuery.isSuccess && nextLesson ? (
              <p className="mt-3 text-sm text-[var(--muted-foreground)]">
                Berikutnya: <span className="font-medium text-[var(--foreground)]">{nextLesson.title}</span>
              </p>
            ) : null}

            <p className="mt-3 text-sm text-[var(--muted-foreground)]">
              Sisa akses:{" "}
              <span className="font-medium text-[var(--foreground)]">
                {formatRemainingAccessTime(accessEndAt)}
              </span>
            </p>

            <p className="mt-3 text-sm text-[var(--muted-foreground)]">
              Status sertifikat:{" "}
              <span className="font-medium text-[var(--foreground)]">{certificateStatus}</span>
            </p>

            <Link
              href={learnHref}
              className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-md bg-[var(--secondary)] px-4 text-sm font-semibold text-[var(--secondary-foreground)] transition hover:opacity-90 sm:h-11"
            >
              {primaryActionLabel}
            </Link>
          </aside>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <article className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm sm:p-5">
          <h2 className="flex items-center gap-2 text-xl font-semibold text-[var(--foreground)] sm:text-2xl">
            <BookText className="size-5" />
            Section Deskripsi
          </h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-[var(--muted-foreground)] sm:text-base lg:text-lg">
            {descriptionText}
          </p>
        </article>

        <article className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm sm:p-5">
          <h2 className="flex items-center gap-2 text-xl font-semibold text-[var(--foreground)] sm:text-2xl">
            <ListChecks className="size-5" />
            Requirements
          </h2>
          {requirementItems.length > 0 ? (
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[var(--muted-foreground)] sm:text-base lg:text-lg">
              {requirementItems.map((item, index) => (
                <li key={`requirement-${index}`}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-[var(--muted-foreground)] sm:text-base lg:text-lg">Belum ada requirement yang ditambahkan.</p>
          )}
        </article>

        <article className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm sm:p-5">
          <h2 className="flex items-center gap-2 text-xl font-semibold text-[var(--foreground)] sm:text-2xl">
            <ListChecks className="size-5" />
            Outcomes
          </h2>
          {outcomeItems.length > 0 ? (
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[var(--muted-foreground)] sm:text-base lg:text-lg">
              {outcomeItems.map((item, index) => (
                <li key={`outcome-${index}`}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-[var(--muted-foreground)] sm:text-base lg:text-lg">Belum ada outcomes yang ditambahkan.</p>
          )}
        </article>

        <article className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm sm:p-5">
          <h2 className="flex items-center gap-2 text-xl font-semibold text-[var(--foreground)] sm:text-2xl">
            <Award className="size-5" />
            Informasi Kelas
          </h2>
          <div className="mt-3 grid gap-2 text-sm text-[var(--muted-foreground)] sm:text-base">
            <p>
              Instructor Name:{" "}
              <span className="font-medium text-[var(--foreground)]">{course?.instructor_name || "-"}</span>
            </p>
            <p>
              Label Kategori:{" "}
              <span className="font-medium text-[var(--foreground)]">{course?.category_name || "-"}</span>
            </p>
            <p>
              Total lesson:{" "}
              <span className="font-medium text-[var(--foreground)]">{summary?.total_lessons ?? "-"}</span>
            </p>
            <p>
              Progress: <span className="font-medium text-[var(--foreground)]">{toPercent(progressValue)}</span>
            </p>
            <p>
              Akses berakhir:{" "}
              <span className="font-medium text-[var(--foreground)]">
                {formatUtcDateTimeToJakarta(accessEndAt)}
              </span>
            </p>
            <p>
              Sisa akses:{" "}
              <span className="font-medium text-[var(--foreground)]">
                {formatRemainingAccessTime(accessEndAt)}
              </span>
            </p>
            <p>
              Assignment wajib:{" "}
              <span className="font-medium text-[var(--foreground)]">
                {assignmentRequirement
                  ? `${assignmentRequirement.approved_assignments} / ${assignmentRequirement.required_assignments}`
                  : "-"}
              </span>
            </p>
            <p>
              Status sertifikat:{" "}
              <span className="font-medium text-[var(--foreground)]">{certificateStatus}</span>
            </p>
            {certificate ? (
              <>
                <p>
                  Nomor sertifikat:{" "}
                  <span className="font-medium text-[var(--foreground)]">{certificate.certificate_number}</span>
                </p>
                <p>
                  Diterbitkan:{" "}
                  <span className="font-medium text-[var(--foreground)]">
                    {formatUtcDateTimeToJakarta(certificate.issued_at)}
                  </span>
                </p>
              </>
            ) : null}
          </div>
        </article>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/student/enrollments" className="inline-flex h-10 items-center text-sm text-primary hover:underline">
          Kembali ke Kelas Saya
        </Link>
        <Link
          href="/student/certificates"
          className="inline-flex h-10 items-center rounded-md border border-[var(--border)] px-4 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-hover)]"
        >
          Lihat Semua Sertifikat
        </Link>
      </div>
    </section>
  );
}
