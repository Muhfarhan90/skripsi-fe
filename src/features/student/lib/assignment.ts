import type { StoreAssignment, StoreAssignmentSubmission } from "@/types/store";

export function formatAssignmentStatus(status: string): string {
  switch (status) {
    case "submitted":
      return "Menunggu Review";
    case "revision_required":
      return "Perlu Revisi";
    case "approved":
      return "Disetujui";
    default:
      return status;
  }
}

export function getLatestAssignmentSubmission(
  assignment: Pick<StoreAssignment, "submissions" | "latest_submission">,
): StoreAssignmentSubmission | null {
  if (assignment.latest_submission) {
    return assignment.latest_submission;
  }

  return assignment.submissions?.[0] ?? null;
}

export function isAssignmentApproved(
  assignment: Pick<StoreAssignment, "submissions" | "latest_submission">,
): boolean {
  return getLatestAssignmentSubmission(assignment)?.status === "approved";
}

export function hasRemainingAssignmentAttempts(
  maxAttempts: number | null | undefined,
  attemptsUsed: number,
): boolean {
  if (!maxAttempts || maxAttempts <= 0) {
    return true;
  }

  return attemptsUsed < maxAttempts;
}

export function getRemainingAssignmentAttempts(
  maxAttempts: number | null | undefined,
  attemptsUsed: number,
): number | null {
  if (!maxAttempts || maxAttempts <= 0) {
    return null;
  }

  return Math.max(maxAttempts - attemptsUsed, 0);
}

export function canSubmitAssignment(assignment: StoreAssignment): boolean {
  const latestSubmission = getLatestAssignmentSubmission(assignment);
  const attemptsUsed = assignment.submissions?.length ?? (latestSubmission ? 1 : 0);
  const hasRemainingAttempts = hasRemainingAssignmentAttempts(assignment.max_attempts, attemptsUsed);

  if (!latestSubmission) {
    return hasRemainingAttempts;
  }

  if (latestSubmission.status === "submitted" || latestSubmission.status === "approved") {
    return false;
  }

  if (latestSubmission.status === "revision_required") {
    return assignment.allow_resubmission && hasRemainingAttempts;
  }

  return false;
}

export function getStudentAssignmentActionLabel(assignment: StoreAssignment): string {
  const latestSubmission = getLatestAssignmentSubmission(assignment);

  if (!latestSubmission) {
    return "Mulai Assignment";
  }

  if (latestSubmission.status === "revision_required" && canSubmitAssignment(assignment)) {
    return "Revisi Assignment";
  }

  if (latestSubmission.status === "submitted") {
    return "Lihat Submission";
  }

  return "Lihat Hasil";
}

export function buildStudentAssignmentHref(
  enrollmentId: number,
  assignmentId: number,
  submissionId?: number | null,
): string {
  if (!submissionId) {
    return `/student/enrollments/${enrollmentId}/learn/assignments/${assignmentId}`;
  }

  return `/student/enrollments/${enrollmentId}/learn/assignments/${assignmentId}?submissionId=${submissionId}`;
}

export function getStudentAssignmentActionClass(assignment: StoreAssignment): string {
  const baseClass =
    "inline-flex h-8 items-center rounded-md border px-3 text-xs font-semibold transition hover:opacity-90";
  const latestSubmission = getLatestAssignmentSubmission(assignment);

  if (!latestSubmission) {
    return `${baseClass} border-[var(--secondary)] bg-[var(--secondary)] text-[var(--secondary-foreground)]`;
  }

  if (latestSubmission.status === "approved") {
    return `${baseClass} border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100`;
  }

  if (latestSubmission.status === "revision_required") {
    return `${baseClass} border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100`;
  }

  return `${baseClass} border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100`;
}
