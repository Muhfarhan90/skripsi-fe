import type { StoreQuizAttempt } from "@/types/store";

export function formatQuizDuration(duration: number | null | undefined): string {
  const value = Number(duration ?? 0);
  return `${value} menit`;
}

export function getActiveQuizAttempt(attempts: StoreQuizAttempt[]): StoreQuizAttempt | null {
  return attempts.find((attempt) => attempt.status === "in_progress") ?? null;
}

export function getLatestQuizAttempt(attempts: StoreQuizAttempt[]): StoreQuizAttempt | null {
  return attempts[0] ?? null;
}

export function isQuizAttemptPassed(
  attempt: StoreQuizAttempt,
  passingScore: number | null | undefined,
): boolean {
  if (attempt.status !== "graded") {
    return false;
  }

  if (passingScore === null || passingScore === undefined) {
    return true;
  }

  return attempt.total_score >= passingScore;
}

export function hasPassedQuizAttempt(
  attempts: StoreQuizAttempt[],
  passingScore: number | null | undefined,
): boolean {
  return attempts.some((attempt) => isQuizAttemptPassed(attempt, passingScore));
}

export function getStudentQuizActionLabel(attempts: StoreQuizAttempt[]): string {
  if (getActiveQuizAttempt(attempts)) {
    return "Lanjutkan Quiz";
  }

  if (getLatestQuizAttempt(attempts)) {
    return "Lihat Hasil";
  }

  return "Mulai Quiz";
}

export function formatQuizAttemptStatus(status: string): string {
  switch (status) {
    case "in_progress":
      return "Sedang Dikerjakan";
    case "submitted":
      return "Menunggu Review";
    case "graded":
      return "Selesai Dinilai";
    default:
      return status;
  }
}

export function buildStudentQuizAttemptHref(
  enrollmentId: number,
  quizId: number,
  attemptId: number,
): string {
  return `/student/enrollments/${enrollmentId}/learn/quizzes/${quizId}?attemptId=${attemptId}`;
}

export function getStudentQuizAttemptLinkLabel(attempt: StoreQuizAttempt): string {
  return attempt.status === "in_progress" ? "Lanjutkan Quiz" : "Lihat Hasil";
}

export function getStudentQuizAttemptLinkClass(
  attempt: StoreQuizAttempt,
  passingScore: number | null | undefined,
): string {
  const baseClass =
    "inline-flex h-8 items-center rounded-md border px-3 text-xs font-semibold transition hover:opacity-90";

  if (attempt.status === "in_progress" || passingScore === null || passingScore === undefined) {
    return `${baseClass} border-[var(--secondary)] bg-[var(--secondary)] text-[var(--secondary-foreground)]`;
  }

  if (isQuizAttemptPassed(attempt, passingScore)) {
    return `${baseClass} border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100`;
  }

  return `${baseClass} border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100`;
}
