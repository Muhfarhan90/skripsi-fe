"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, GraduationCap, Trophy } from "lucide-react";
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
  const progress = toSafeProgress(enrollment.progress);

  return (
    <article className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm transition hover:shadow-md">
      <div className="relative aspect-[16/7] bg-[var(--muted)]">
        {enrollment.course?.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={enrollment.course.thumbnail}
            alt={enrollment.course?.title ?? "Course thumbnail"}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[var(--primary)]/10 to-[var(--primary)]/20">
            <BookOpen className="size-10 text-[var(--primary)]/40" />
          </div>
        )}

        <span
          className={[
            "absolute right-2.5 top-2.5 inline-flex rounded-lg px-2.5 py-1 text-[11px] font-bold shadow-sm",
            isCompleted
              ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
              : "bg-[var(--secondary)] text-[var(--secondary-foreground)]",
          ].join(" ")}
        >
          {isCompleted ? "Selesai" : "Sedang Dipelajari"}
        </span>
      </div>

      <div className="p-4">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {enrollment.course?.category_name ? (
            <span className="inline-flex rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-2 py-0.5 text-[10px] font-medium text-[var(--muted-foreground)]">
              {enrollment.course.category_name}
            </span>
          ) : null}
        </div>

        <h2 className="line-clamp-2 text-base font-bold leading-snug text-[var(--foreground)]">
          {enrollment.course?.title ?? `Course #${enrollment.course_id}`}
        </h2>

        {enrollment.course?.instructor_name ? (
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">{enrollment.course.instructor_name}</p>
        ) : null}

        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
          Sisa akses:{" "}
          <span className="font-semibold text-[var(--foreground)]">
            {formatRemainingAccessTime(enrollment.ended_at ?? enrollment.expired_at)}
          </span>
        </p>

        <div className="mt-3">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-[var(--muted-foreground)]">Progress</span>
            <span className="font-bold text-[var(--foreground)]">{toPercent(enrollment.progress)}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-soft)]">
            <div className="h-full rounded-full bg-[var(--secondary)] transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <Link
          href={action.href}
          className="mt-4 inline-flex h-9 w-full items-center justify-center rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)] text-sm font-semibold transition hover:opacity-90 active:scale-95"
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
    <section className="space-y-4">
      <header className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-4 shadow-sm">
        <h1 className="text-xl font-bold text-[var(--foreground)]">Kelas Saya</h1>
        <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
          Daftar kelas yang sedang dipelajari dan kelas yang sudah selesai.
        </p>
      </header>

      {enrollmentsQuery.isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-56 animate-pulse rounded-2xl bg-[var(--border)]" />
          ))}
        </div>
      ) : null}

      {enrollmentsQuery.isError ? (
        <article className="rounded-xl border border-[var(--danger-soft-border)] bg-[var(--danger-soft-bg)] p-4 text-sm text-[var(--danger-soft-foreground)]">
          Gagal memuat kelas. Silakan coba lagi.
        </article>
      ) : null}

      {enrollmentsQuery.data ? (
        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-1.5 shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab("in_progress")}
            className={[
              "inline-flex h-10 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition",
              activeTab === "in_progress"
                ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm"
                : "text-[var(--muted-foreground)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]",
            ].join(" ")}
          >
            <GraduationCap className="size-4" />
            Aktif{" "}
            <span
              className={[
                "inline-flex size-5 items-center justify-center rounded-full text-[10px] font-bold",
                activeTab === "in_progress"
                  ? "bg-white/20 text-white"
                  : "bg-[var(--surface-soft)] text-[var(--muted-foreground)]",
              ].join(" ")}
            >
              {inProgressClasses.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("completed")}
            className={[
              "inline-flex h-10 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition",
              activeTab === "completed"
                ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm"
                : "text-[var(--muted-foreground)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]",
            ].join(" ")}
          >
            <Trophy className="size-4" />
            Selesai{" "}
            <span
              className={[
                "inline-flex size-5 items-center justify-center rounded-full text-[10px] font-bold",
                activeTab === "completed"
                  ? "bg-white/20 text-white"
                  : "bg-[var(--surface-soft)] text-[var(--muted-foreground)]",
              ].join(" ")}
            >
              {completedClasses.length}
            </span>
          </button>
        </div>
      ) : null}

      {enrollmentsQuery.data && enrollments.length === 0 ? (
        <article className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)] p-8 text-center shadow-sm">
          <GraduationCap className="size-10 text-[var(--muted-foreground)]" />
          <div>
            <p className="font-semibold text-[var(--foreground)]">Belum ada kelas aktif</p>
            <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
              Jelajahi katalog untuk mendaftar kelas pertama kamu.
            </p>
          </div>
          <Link
            href="/student/catalog"
            className="inline-flex h-9 items-center rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white transition active:scale-95"
          >
            Jelajahi Course
          </Link>
        </article>
      ) : null}

      {enrollmentsQuery.data && enrollments.length > 0 && visibleClasses.length === 0 ? (
        <article className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)] p-6 text-center shadow-sm">
          <p className="text-sm text-[var(--muted-foreground)]">{emptyTabMessage}</p>
        </article>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visibleClasses.map((enrollment) => (
          <ClassCard key={enrollment.id} enrollment={enrollment} />
        ))}
      </div>
    </section>
  );
}
