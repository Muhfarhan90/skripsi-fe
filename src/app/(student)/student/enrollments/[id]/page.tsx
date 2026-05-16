"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookText, GraduationCap, ListChecks, Tags, UserRound } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";
import {
  completeStudentEnrollment,
  getStudentEnrollmentById,
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
  const queryClient = useQueryClient();
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

  const completeMutation = useMutation({
    mutationFn: () => completeStudentEnrollment(enrollmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student", "enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["student", "enrollment", enrollmentId] });
      queryClient.invalidateQueries({ queryKey: ["student", "enrollment", enrollmentId, "summary"] });
      toast.success("Enrollment berhasil ditandai selesai.");
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        toast.error(error.message);
        return;
      }

      toast.error("Gagal menyelesaikan enrollment.");
    },
  });

  if (enrollmentQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Memuat detail enrollment...</p>;
  }

  if (enrollmentQuery.isError || !enrollmentQuery.data) {
    return <p className="text-sm text-red-600">Enrollment tidak ditemukan.</p>;
  }

  const enrollment = enrollmentQuery.data;
  const course = enrollment.course;
  const summary = summaryQuery.data;
  const nextLesson = nextLessonQuery.data;
  const canComplete = (summary?.progress ?? enrollment.progress ?? 0) >= 100 && enrollment.status !== "completed";
  const progressValue = toProgressValue(summary?.progress ?? enrollment.progress);
  const requirementItems = parseTextItems(course?.requirements);
  const outcomeItems = parseTextItems(course?.outcomes);
  const descriptionText = course?.description?.trim() || "Deskripsi kelas belum tersedia.";
  const assignmentRequirement = summary?.assignment_requirement;
  const accessEndAt = summary?.ended_at ?? enrollment.ended_at ?? enrollment.expired_at;

  return (
    <section className="space-y-5">
      <header className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
        <div className="grid gap-6 bg-[linear-gradient(120deg,#17212e,#1f2937)] p-6 lg:grid-cols-[1fr_360px]">
          <div>
            <p className="text-xs text-zinc-300">Enrollment #{enrollment.id}</p>
            <h1 className="mt-2 text-4xl font-semibold leading-tight text-white">
              {course?.title ?? `Course #${enrollment.course_id}`}
            </h1>
            <p className="mt-3 max-w-4xl text-lg leading-relaxed text-zinc-200">{descriptionText}</p>

            <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-zinc-200">
              {course?.instructor_name ? (
                <span className="inline-flex items-center gap-2 rounded-md bg-white/10 px-3 py-1.5">
                  <UserRound className="size-4" />
                  {course.instructor_name}
                </span>
              ) : null}
              {course?.category_name ? (
                <span className="inline-flex items-center gap-2 rounded-md bg-white/10 px-3 py-1.5">
                  <Tags className="size-4" />
                  {course.category_name}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-2 rounded-md bg-white/10 px-3 py-1.5">
                <GraduationCap className="size-4" />
                Status: {enrollment.status}
              </span>
            </div>
          </div>

          <aside className="rounded-xl border border-white/20 bg-white p-5 text-[var(--foreground)]">
            <h2 className="text-4xl font-semibold">Lanjutkan Belajar</h2>
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

            <Link
              href={`/student/enrollments/${enrollment.id}/learn`}
              className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-md bg-[var(--secondary)] px-4 text-sm font-semibold text-[var(--secondary-foreground)] transition hover:opacity-90"
            >
              Lanjut Belajar
            </Link>
          </aside>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <article className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-2xl font-semibold text-[var(--foreground)]">
            <BookText className="size-5" />
            Section Deskripsi
          </h2>
          <p className="mt-3 whitespace-pre-line text-lg leading-relaxed text-[var(--muted-foreground)]">
            {descriptionText}
          </p>
        </article>

        <article className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-2xl font-semibold text-[var(--foreground)]">
            <ListChecks className="size-5" />
            Requirements
          </h2>
          {requirementItems.length > 0 ? (
            <ul className="mt-3 list-disc space-y-2 pl-5 text-lg text-[var(--muted-foreground)]">
              {requirementItems.map((item, index) => (
                <li key={`requirement-${index}`}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-lg text-[var(--muted-foreground)]">Belum ada requirement yang ditambahkan.</p>
          )}
        </article>

        <article className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-2xl font-semibold text-[var(--foreground)]">
            <ListChecks className="size-5" />
            Outcomes
          </h2>
          {outcomeItems.length > 0 ? (
            <ul className="mt-3 list-disc space-y-2 pl-5 text-lg text-[var(--muted-foreground)]">
              {outcomeItems.map((item, index) => (
                <li key={`outcome-${index}`}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-lg text-[var(--muted-foreground)]">Belum ada outcomes yang ditambahkan.</p>
          )}
        </article>

        <article className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-2xl font-semibold text-[var(--foreground)]">
            <UserRound className="size-5" />
            Informasi Kelas
          </h2>
          <div className="mt-3 grid gap-2 text-lg text-[var(--muted-foreground)]">
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
              <span className="font-medium text-[var(--foreground)]">
                {assignmentRequirement
                  ? assignmentRequirement.is_satisfied
                    ? "Syarat assignment terpenuhi"
                    : "Masih menunggu approval assignment"
                  : "-"}
              </span>
            </p>
          </div>
        </article>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/student/enrollments" className="inline-flex h-10 items-center text-sm text-primary hover:underline">
          Kembali ke daftar enrollment
        </Link>
        {canComplete ? (
          <button
            type="button"
            onClick={() => completeMutation.mutate()}
            disabled={completeMutation.isPending}
            className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-70"
          >
            Tandai Course Selesai
          </button>
        ) : null}
      </div>
    </section>
  );
}
