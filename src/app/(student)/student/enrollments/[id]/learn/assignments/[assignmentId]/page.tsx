"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, CircleAlert, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";
import {
  getStudentEnrollmentAssignmentDetail,
  getStudentEnrollmentProgressSummary,
  submitStudentAssignment,
} from "@/features/student/api/store-api";
import {
  buildStudentAssignmentHref,
  canSubmitAssignment,
  formatAssignmentStatus,
  getLatestAssignmentSubmission,
  getRemainingAssignmentAttempts,
} from "@/features/student/lib/assignment";
import { formatUtcDateTimeToJakarta } from "@/features/student/lib/date-time";

function isHttpUrl(value: string | null | undefined): boolean {
  if (!value) {
    return false;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export default function StudentEnrollmentAssignmentPage() {
  const params = useParams<{ id: string; assignmentId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const enrollmentId = Number(params.id);
  const assignmentId = Number(params.assignmentId);
  const requestedSubmissionId = Number(searchParams.get("submissionId"));
  const hasRequestedSubmissionId = Number.isFinite(requestedSubmissionId) && requestedSubmissionId > 0;
  const [submissionText, setSubmissionText] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");

  const assignmentQuery = useQuery({
    queryKey: ["student", "enrollment", enrollmentId, "assignment", assignmentId, "detail"],
    queryFn: () => getStudentEnrollmentAssignmentDetail(enrollmentId, assignmentId),
    enabled:
      Number.isFinite(enrollmentId) &&
      enrollmentId > 0 &&
      Number.isFinite(assignmentId) &&
      assignmentId > 0,
  });

  const summaryQuery = useQuery({
    queryKey: ["student", "enrollment", enrollmentId, "summary"],
    queryFn: () => getStudentEnrollmentProgressSummary(enrollmentId),
    enabled: Number.isFinite(enrollmentId) && enrollmentId > 0,
  });

  const assignment = assignmentQuery.data;
  const submissions = assignment?.submissions ?? [];
  const latestSubmission = assignment ? getLatestAssignmentSubmission(assignment) : null;
  const selectedSubmission =
    (hasRequestedSubmissionId
      ? submissions.find((submission) => submission.id === requestedSubmissionId) ?? null
      : null) ??
    latestSubmission;
  const attemptsUsed = latestSubmission?.attempt_no ?? 0;
  const remainingAttempts = assignment
    ? getRemainingAssignmentAttempts(assignment.max_attempts, attemptsUsed)
    : null;
  const canSubmit = assignment ? canSubmitAssignment(assignment) : false;
  const assignmentRequirement = summaryQuery.data?.assignment_requirement;

  const submitMutation = useMutation({
    mutationFn: () =>
      submitStudentAssignment(enrollmentId, assignmentId, {
        submission_text: submissionText.trim() || undefined,
        attachment_url: attachmentUrl.trim() || undefined,
      }),
    onSuccess: (submission) => {
      setSubmissionText("");
      setAttachmentUrl("");
      queryClient.invalidateQueries({
        queryKey: ["student", "enrollment", enrollmentId, "assignment", assignmentId, "detail"],
      });
      queryClient.invalidateQueries({
        queryKey: ["student", "enrollment", enrollmentId, "assignments"],
      });
      queryClient.invalidateQueries({
        queryKey: ["student", "enrollment", enrollmentId, "summary"],
      });
      queryClient.invalidateQueries({
        queryKey: ["student", "enrollment", enrollmentId, "curriculum"],
      });
      toast.success("Assignment berhasil dikirim.");
      router.replace(buildStudentAssignmentHref(enrollmentId, assignmentId, submission.id));
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        toast.error(error.message);
        return;
      }

      toast.error("Assignment belum bisa dikirim.");
    },
  });

  const submissionHint = useMemo(() => {
    if (!assignment) {
      return null;
    }

    if (!latestSubmission) {
      return "Belum ada submission. Anda bisa mengirim assignment dari form di bawah.";
    }

    if (latestSubmission.status === "submitted") {
      return "Submission terakhir masih menunggu review instruktur.";
    }

    if (latestSubmission.status === "approved") {
      return "Assignment ini sudah disetujui. Submission baru tidak diperlukan.";
    }

    if (latestSubmission.status === "revision_required" && canSubmit) {
      return "Instruktur meminta revisi. Silakan kirim perbaikan melalui form di bawah.";
    }

    if (latestSubmission.status === "revision_required") {
      return "Assignment ini membutuhkan revisi, tetapi resubmission sudah tidak tersedia.";
    }

    return null;
  }, [assignment, canSubmit, latestSubmission]);

  if (assignmentQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Memuat detail assignment...</p>;
  }

  if (assignmentQuery.isError || !assignment) {
    return <p className="text-sm text-red-600">Detail assignment tidak bisa diakses.</p>;
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Link
          href={`/student/enrollments/${enrollmentId}/learn?assignmentId=${assignmentId}`}
          className="inline-flex items-center gap-2 text-primary hover:underline"
        >
          <ArrowLeft className="size-4" />
          Kembali ke halaman belajar
        </Link>
        <Link href={`/student/enrollments/${enrollmentId}`} className="text-primary hover:underline">
          Detail enrollment
        </Link>
      </div>

      <header className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
        <p className="text-xs font-semibold tracking-[0.08em] text-[var(--muted-foreground)] uppercase">
          Student Assignment
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-[var(--foreground)]">{assignment.title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[var(--muted-foreground)]">
          {assignment.description || "Assignment ini belum memiliki deskripsi."}
        </p>
      </header>

      <div className="grid gap-5 xl:grid-cols-[340px_1fr]">
        <aside className="space-y-5">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
            <p className="text-xs font-semibold tracking-[0.08em] text-[var(--muted-foreground)] uppercase">
              Ringkasan Assignment
            </p>
            <div className="mt-3 space-y-2 text-sm text-[var(--muted-foreground)]">
              <p>
                Deadline: <span className="font-medium text-[var(--foreground)]">{formatUtcDateTimeToJakarta(assignment.due_at)}</span>
              </p>
              <p>
                Max attempts: <span className="font-medium text-[var(--foreground)]">{assignment.max_attempts ?? "Tidak dibatasi"}</span>
              </p>
              <p>
                Attempt terpakai: <span className="font-medium text-[var(--foreground)]">{attemptsUsed}</span>
              </p>
              <p>
                Attempt tersisa: <span className="font-medium text-[var(--foreground)]">{remainingAttempts ?? "Tidak dibatasi"}</span>
              </p>
              <p>
                Resubmission: <span className="font-medium text-[var(--foreground)]">{assignment.allow_resubmission ? "Diizinkan" : "Tidak"}</span>
              </p>
              <p>
                Sertifikat: <span className="font-medium text-[var(--foreground)]">{assignment.is_required_for_certificate ? "Wajib" : "Opsional"}</span>
              </p>
              {assignment.section?.title ? (
                <p>
                  Section: <span className="font-medium text-[var(--foreground)]">{assignment.section.title}</span>
                </p>
              ) : null}
            </div>
          </div>

          {summaryQuery.isSuccess ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
              <p className="text-xs font-semibold tracking-[0.08em] text-[var(--muted-foreground)] uppercase">
                Persyaratan Sertifikat
              </p>
              <div className="mt-3 space-y-2 text-sm text-[var(--muted-foreground)]">
                <p>
                  Assignment wajib:{" "}
                  <span className="font-medium text-[var(--foreground)]">
                    {assignmentRequirement?.required_assignments ?? 0}
                  </span>
                </p>
                <p>
                  Sudah disetujui:{" "}
                  <span className="font-medium text-[var(--foreground)]">
                    {assignmentRequirement?.approved_assignments ?? 0}
                  </span>
                </p>
                <p>
                  Status:{" "}
                  <span className="font-medium text-[var(--foreground)]">
                    {assignmentRequirement?.is_satisfied ? "Terpenuhi" : "Belum terpenuhi"}
                  </span>
                </p>
              </div>
            </div>
          ) : null}

        </aside>

        <div className="space-y-5">
          {assignment.instructions ? (
            <article className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
              <h2 className="text-xl font-semibold text-[var(--foreground)]">Instruksi Assignment</h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-[var(--muted-foreground)]">
                {assignment.instructions}
              </p>
            </article>
          ) : null}

          <article className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold tracking-[0.08em] text-[var(--muted-foreground)] uppercase">
                  {selectedSubmission ? `Attempt #${selectedSubmission.attempt_no}` : "Status Assignment"}
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
                  {selectedSubmission ? "Ringkasan Submission" : "Siap Mengirim Assignment"}
                </h2>
                {selectedSubmission ? (
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                    Status: {formatAssignmentStatus(selectedSubmission.status)}
                  </p>
                ) : null}
              </div>
              {selectedSubmission?.status === "approved" ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                  <CheckCircle2 className="size-3.5" />
                  Submission disetujui
                </span>
              ) : null}
            </div>

            {submissionHint ? (
              <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 px-4 py-3 text-sm text-[var(--muted-foreground)]">
                {submissionHint}
              </div>
            ) : null}

            {selectedSubmission ? (
              <div className="mt-4 space-y-4">
                <div className="grid gap-3 text-sm text-[var(--muted-foreground)] md:grid-cols-3">
                  <p>
                    Dikirim: <span className="font-medium text-[var(--foreground)]">{formatUtcDateTimeToJakarta(selectedSubmission.submitted_at)}</span>
                  </p>
                  <p>
                    Direview: <span className="font-medium text-[var(--foreground)]">{formatUtcDateTimeToJakarta(selectedSubmission.reviewed_at)}</span>
                  </p>
                  <p>
                    Reviewer: <span className="font-medium text-[var(--foreground)]">{selectedSubmission.reviewer_name || "-"}</span>
                  </p>
                </div>

                <div className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/20 p-4">
                  <p className="text-sm font-medium text-[var(--foreground)]">Submission Text</p>
                  <p className="mt-2 whitespace-pre-line text-sm text-[var(--muted-foreground)]">
                    {selectedSubmission.submission_text || "Tidak ada teks submission."}
                  </p>
                </div>

                <div className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/20 p-4">
                  <p className="text-sm font-medium text-[var(--foreground)]">Lampiran</p>
                  {selectedSubmission.attachment_url ? (
                    isHttpUrl(selectedSubmission.attachment_url) ? (
                      <a
                        href={selectedSubmission.attachment_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex text-sm text-primary hover:underline"
                      >
                        Buka lampiran submission
                      </a>
                    ) : (
                      <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                        {selectedSubmission.attachment_url}
                      </p>
                    )
                  ) : (
                    <p className="mt-2 text-sm text-[var(--muted-foreground)]">Tidak ada lampiran.</p>
                  )}
                </div>

                <div className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/20 p-4">
                  <p className="text-sm font-medium text-[var(--foreground)]">Catatan Reviewer</p>
                  <p className="mt-2 whitespace-pre-line text-sm text-[var(--muted-foreground)]">
                    {selectedSubmission.review_notes || "Belum ada catatan review."}
                  </p>
                </div>
              </div>
            ) : null}
          </article>

          <article className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-[var(--foreground)]">
              {latestSubmission?.status === "revision_required" && canSubmit
                ? "Kirim Revisi Assignment"
                : "Kirim Assignment"}
            </h2>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              Isi minimal salah satu: teks submission atau lampiran URL/path.
            </p>

            {!canSubmit ? (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <p className="flex items-center gap-2 font-medium">
                  <CircleAlert className="size-4" />
                  Submission baru belum tersedia
                </p>
                <p className="mt-1">
                  {submissionHint || "Assignment ini belum bisa menerima submission baru."}
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="space-y-2">
                  <label htmlFor="assignment-submission-text" className="text-sm font-medium text-[var(--foreground)]">
                    Submission Text
                  </label>
                  <textarea
                    id="assignment-submission-text"
                    value={submissionText}
                    onChange={(event) => setSubmissionText(event.target.value)}
                    rows={8}
                    className="w-full rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--secondary)]"
                    placeholder="Tulis jawaban, link dokumen, atau ringkasan submission Anda..."
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="assignment-attachment-url" className="text-sm font-medium text-[var(--foreground)]">
                    Lampiran URL / Path
                  </label>
                  <input
                    id="assignment-attachment-url"
                    type="text"
                    value={attachmentUrl}
                    onChange={(event) => setAttachmentUrl(event.target.value)}
                    className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--card)] px-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--secondary)]"
                    placeholder="Contoh: https://drive.google.com/... atau path file"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (!submissionText.trim() && !attachmentUrl.trim()) {
                        toast.error("Isi submission text atau attachment URL terlebih dahulu.");
                        return;
                      }

                      submitMutation.mutate();
                    }}
                    disabled={submitMutation.isPending}
                    className="inline-flex h-10 items-center rounded-md bg-[var(--secondary)] px-4 text-sm font-medium text-[var(--secondary-foreground)] transition hover:opacity-90 disabled:opacity-70"
                  >
                    {submitMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Mengirim Assignment
                      </>
                    ) : latestSubmission?.status === "revision_required" ? (
                      "Kirim Revisi"
                    ) : (
                      "Kirim Assignment"
                    )}
                  </button>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    Setelah dikirim, submission akan menunggu review instruktur.
                  </p>
                </div>
              </div>
            )}
          </article>
        </div>
      </div>
    </section>
  );
}
