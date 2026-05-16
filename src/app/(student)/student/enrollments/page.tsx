"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getStudentEnrollments } from "@/features/student/api/store-api";
import { formatRemainingAccessTime } from "@/features/student/lib/date-time";

function toPercent(value: number | null | undefined): string {
  return `${Math.max(0, Math.min(100, Number(value ?? 0)))}%`;
}

function toSafeProgress(value: number | null | undefined): number {
  return Math.max(0, Math.min(100, Number(value ?? 0)));
}

export default function StudentEnrollmentsPage() {
  const enrollmentsQuery = useQuery({
    queryKey: ["student", "enrollments"],
    queryFn: getStudentEnrollments,
  });

  return (
    <section className="space-y-5">
      <header className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h1 className="text-2xl font-semibold text-foreground">Kelas Aktif</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Daftar course yang sudah aktif setelah pembayaran terkonfirmasi.
        </p>
      </header>

      {enrollmentsQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Memuat enrollment...</p>
      ) : null}
      {enrollmentsQuery.isError ? (
        <p className="text-sm text-red-600">Gagal memuat enrollment.</p>
      ) : null}

      {enrollmentsQuery.data && enrollmentsQuery.data.length === 0 ? (
        <article className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Belum ada enrollment aktif.</p>
          <Link href="/student/catalog" className="mt-3 inline-flex text-sm text-primary hover:underline">
            Jelajahi course
          </Link>
        </article>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {enrollmentsQuery.data?.map((enrollment) => (
          <article key={enrollment.id} className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
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

              <span className="absolute right-3 top-3 inline-flex rounded-md bg-[var(--secondary)] px-2 py-1 text-xs font-semibold text-[var(--secondary-foreground)]">
                Kelas
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
                href={`/student/enrollments/${enrollment.id}`}
                className="inline-flex h-10 w-full items-center justify-center rounded-md bg-[var(--secondary)] px-4 text-sm font-semibold text-[var(--secondary-foreground)] transition hover:opacity-90"
              >
                Akses Materi
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
