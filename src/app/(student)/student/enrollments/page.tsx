"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getStudentEnrollments } from "@/features/student/api/store-api";
import { formatRemainingAccessTime } from "@/features/student/lib/date-time";
import type { StoreEnrollment } from "@/types/store";

type ClassTab = "in_progress" | "completed";

function toPercent(value: number | null | undefined): string {
  return `${Math.max(0, Math.min(100, Number(value ?? 0)))}%`;
}

function toSafeProgress(value: number | null | undefined): number {
  return Math.max(0, Math.min(100, Number(value ?? 0)));
}

function isCompletedClass(enrollment: StoreEnrollment): boolean {
  return enrollment.status === "completed" || toSafeProgress(enrollment.progress) >= 100;
}

function getClassAction(enrollment: StoreEnrollment): { href: string; label: string } {
  if (isCompletedClass(enrollment)) {
    return {
      href: `/student/enrollments/${enrollment.id}/learn?panel=certificate`,
      label: "Lihat Sertifikat",
    };
  }

  return {
    href: `/student/enrollments/${enrollment.id}`,
    label: "Akses Materi",
  };
}

function ClassCard({ enrollment }: { enrollment: StoreEnrollment }) {
  const isCompleted = isCompletedClass(enrollment);
  const action = getClassAction(enrollment);

  return (
    <article className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
      <div className="relative aspect-[16/8] bg-[var(--muted)]">
        {enrollment.course?.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={enrollment.course.thumbnail}
            alt={enrollment.course?.title ?? "Course thumbnail"}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-[var(--muted-foreground)]">
            Thumbnail course
          </div>
        )}

        <span
          className={[
            "absolute right-3 top-3 inline-flex rounded-md px-2 py-1 text-xs font-semibold",
            isCompleted
              ? "border border-[var(--primary)]/20 bg-[var(--primary)]/10 text-[var(--primary)]"
              : "bg-[var(--secondary)] text-[var(--secondary-foreground)]",
          ].join(" ")}
        >
          {isCompleted ? "Selesai" : "Sedang Dipelajari"}
        </span>
      </div>

      <div className="space-y-4 p-4">
        <div>
          <h2 className="line-clamp-2 text-2xl font-semibold leading-tight text-[var(--foreground)]">
            {enrollment.course?.title ?? `Course #${enrollment.course_id}`}
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            {enrollment.course?.category_name ? (
              <span className="inline-flex rounded-full border border-[var(--border)] bg-[var(--muted)] px-2 py-0.5 text-[var(--muted-foreground)]">
                {enrollment.course.category_name}
              </span>
            ) : null}
            <span className="text-[var(--muted-foreground)]">Status: {enrollment.status}</span>
          </div>
          {enrollment.course?.instructor_name ? (
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Instructor: {enrollment.course.instructor_name}
            </p>
          ) : null}
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Sisa akses:{" "}
            <span className="font-medium text-[var(--foreground)]">
              {formatRemainingAccessTime(enrollment.ended_at ?? enrollment.expired_at)}
            </span>
          </p>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="text-[var(--muted-foreground)]">Progress</span>
            <span className="font-semibold text-[var(--foreground)]">{toPercent(enrollment.progress)}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--muted)]">
            <div
              className="h-full rounded-full bg-[var(--secondary)]"
              style={{ width: `${toSafeProgress(enrollment.progress)}%` }}
            />
          </div>
        </div>

        <Link
          href={action.href}
          className="inline-flex h-10 w-full items-center justify-center rounded-md bg-[var(--secondary)] px-4 text-sm font-semibold text-[var(--secondary-foreground)] transition hover:opacity-90"
        >
          {action.label}
        </Link>
      </div>
    </article>
  );
}

export default function StudentEnrollmentsPage() {
  const [activeTab, setActiveTab] = useState<ClassTab>("in_progress");
  const enrollmentsQuery = useQuery({
    queryKey: ["student", "enrollments"],
    queryFn: getStudentEnrollments,
  });
  const enrollments = enrollmentsQuery.data ?? [];
  const inProgressClasses = enrollments.filter((enrollment) => !isCompletedClass(enrollment));
  const completedClasses = enrollments.filter((enrollment) => isCompletedClass(enrollment));
  const visibleClasses = activeTab === "in_progress" ? inProgressClasses : completedClasses;
  const emptyTabMessage =
    activeTab === "in_progress"
      ? "Belum ada kelas yang sedang dipelajari."
      : "Belum ada kelas yang selesai.";

  return (
    <section className="space-y-5">
      <header className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h1 className="text-2xl font-semibold text-foreground">Kelas Saya</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Daftar kelas yang sedang dipelajari dan kelas yang sudah selesai.
        </p>
      </header>

      {enrollmentsQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Memuat kelas...</p>
      ) : null}
      {enrollmentsQuery.isError ? (
        <p className="text-sm text-red-600">Gagal memuat kelas.</p>
      ) : null}

      {enrollmentsQuery.data ? (
        <div className="flex flex-wrap gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] p-2 shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab("in_progress")}
            className={[
              "inline-flex h-10 items-center rounded-lg px-4 text-sm font-semibold transition",
              activeTab === "in_progress"
                ? "bg-[var(--secondary)] text-[var(--secondary-foreground)]"
                : "text-[var(--muted-foreground)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]",
            ].join(" ")}
          >
            Sedang Dipelajari ({inProgressClasses.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("completed")}
            className={[
              "inline-flex h-10 items-center rounded-lg px-4 text-sm font-semibold transition",
              activeTab === "completed"
                ? "bg-[var(--secondary)] text-[var(--secondary-foreground)]"
                : "text-[var(--muted-foreground)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]",
            ].join(" ")}
          >
            Selesai ({completedClasses.length})
          </button>
        </div>
      ) : null}

      {enrollmentsQuery.data && enrollments.length === 0 ? (
        <article className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Belum ada kelas aktif.</p>
          <Link href="/student/catalog" className="mt-3 inline-flex text-sm text-primary hover:underline">
            Jelajahi course
          </Link>
        </article>
      ) : null}

      {enrollmentsQuery.data && enrollments.length > 0 && visibleClasses.length === 0 ? (
        <article className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">{emptyTabMessage}</p>
        </article>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visibleClasses.map((enrollment) => (
          <ClassCard key={enrollment.id} enrollment={enrollment} />
        ))}
      </div>
    </section>
  );
}
