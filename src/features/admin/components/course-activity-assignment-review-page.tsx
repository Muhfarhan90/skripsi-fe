"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Layers3, Loader2, RefreshCcw, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/features/admin/components/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  createEmptyAdminPaginationMeta,
  getAdminAcademicPeriods,
  getAdminCourseCurriculum,
  getAdminCourseOfferingById,
  getAdminCourseOfferings,
  listAdminCourseOfferingAssignmentSubmissions,
  reviewAdminAssignmentSubmission,
} from "@/features/admin/api/master-api";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { AdminPagination } from "@/features/admin/components/admin-pagination";
import {
  buildOfferingOptionLabel,
  formatAssignmentReviewStatus,
  formatProgress,
  parsePositiveIntegerParam,
} from "@/features/admin/lib/course-activity";
import { formatDateTime, toStatusLabel } from "@/features/admin/lib/offering-utils";
import { ApiError } from "@/lib/api/client";
import { resolvePublicFileUrl } from "@/lib/file-url";

export function AdminCourseActivityAssignmentReviewPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const queryClient = useQueryClient();
  const selectedOfferingId = parsePositiveIntegerParam(searchParams.get("offeringId"));
  const selectedSubmissionIdParam = parsePositiveIntegerParam(searchParams.get("submissionId"));
  const [searchKeyword, setSearchKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [assignmentFilter, setAssignmentFilter] = useState("all");
  const [reviewDraft, setReviewDraft] = useState<{ submissionId: number | null; notes: string }>({
    submissionId: null,
    notes: "",
  });

  const activePeriodsQuery = useQuery({
    queryKey: ["admin", "course-activity", "assignment-review", "active-period"],
    queryFn: () => getAdminAcademicPeriods({ is_active: true }),
    staleTime: 60_000,
  });

  const activePeriod = activePeriodsQuery.data?.[0] ?? null;
  const activePeriodId = activePeriod?.id ?? null;
  const activePeriodLabel = activePeriod?.name ?? activePeriod?.code ?? null;

  const offeringsQuery = useQuery({
    queryKey: ["admin", "course-activity", "assignment-review", "offering-options", activePeriodId],
    queryFn: () => getAdminCourseOfferings({ academic_period_id: activePeriodId as number }),
    enabled: activePeriodId !== null,
  });

  const selectedOfferingQuery = useQuery({
    queryKey: ["admin", "course-activity", "assignment-review", "offering", selectedOfferingId],
    queryFn: () => getAdminCourseOfferingById(selectedOfferingId as number),
    enabled: selectedOfferingId !== null,
  });

  const curriculumQuery = useQuery({
    queryKey: ["admin", "course-activity", "assignment-review", "curriculum", selectedOfferingQuery.data?.course_id],
    queryFn: () => getAdminCourseCurriculum(selectedOfferingQuery.data?.course_id as number),
    enabled: Boolean(selectedOfferingQuery.data?.course_id),
  });

  const submissionsQuery = useQuery({
    queryKey: [
      "admin",
      "course-activity",
      "assignment-review",
      selectedOfferingId,
      assignmentFilter,
      statusFilter,
      searchKeyword,
      page,
    ],
    queryFn: () =>
      listAdminCourseOfferingAssignmentSubmissions(selectedOfferingId as number, {
        assignment_id: assignmentFilter === "all" ? undefined : assignmentFilter,
        status: statusFilter === "all" ? undefined : statusFilter,
        search: searchKeyword,
        page,
      }),
    enabled: selectedOfferingId !== null,
  });

  const selectedOffering = useMemo(
    () =>
      offeringsQuery.data?.find((offering) => offering.id === selectedOfferingId) ??
      selectedOfferingQuery.data ??
      null,
    [offeringsQuery.data, selectedOfferingId, selectedOfferingQuery.data],
  );
  const curriculumAssignments = useMemo(
    () =>
      (curriculumQuery.data?.sections ?? []).flatMap((section) => section.assignments ?? []),
    [curriculumQuery.data],
  );
  const submissionRows = useMemo(
    () => submissionsQuery.data?.items ?? [],
    [submissionsQuery.data?.items],
  );
  const submissionMeta = submissionsQuery.data?.meta ?? createEmptyAdminPaginationMeta(page);
  const effectiveSelectedSubmissionId = useMemo(() => {
    if (submissionRows.length === 0) {
      return null;
    }

    const targetId = selectedSubmissionIdParam ?? submissionRows[0]?.id ?? null;
    return submissionRows.some((submission) => submission.id === targetId) ? targetId : submissionRows[0]?.id ?? null;
  }, [selectedSubmissionIdParam, submissionRows]);
  const selectedSubmission = useMemo(
    () => submissionRows.find((submission) => submission.id === effectiveSelectedSubmissionId) ?? null,
    [effectiveSelectedSubmissionId, submissionRows],
  );
  const reviewNotes =
    reviewDraft.submissionId === effectiveSelectedSubmissionId
      ? reviewDraft.notes
      : selectedSubmission?.review_notes ?? "";
  const courseMasterHref = selectedOffering?.course_id
    ? `/admin/master-data/courses/${selectedOffering.course_id}?step=curriculum`
    : "/admin/master-data/courses";
  const selectedOfferingLabel = selectedOffering
    ? buildOfferingOptionLabel(selectedOffering)
    : "Pilih offering untuk membuka assignment review";
  const hasOfferingOptions = (offeringsQuery.data?.length ?? 0) > 0;
  const hasActivePeriod = activePeriodId !== null;

  useEffect(() => {
    if (selectedOfferingId !== null) {
      return;
    }

    if (!hasActivePeriod) {
      return;
    }

    const defaultOfferingId = offeringsQuery.data?.[0]?.id;
    if (!defaultOfferingId) {
      return;
    }

    const nextParams = new URLSearchParams(searchParamsString);
    nextParams.set("offeringId", String(defaultOfferingId));
    nextParams.delete("submissionId");
    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
  }, [hasActivePeriod, offeringsQuery.data, pathname, router, searchParamsString, selectedOfferingId]);

  const reviewMutation = useMutation({
    mutationFn: ({
      submissionId,
      status,
      notes,
    }: {
      submissionId: number;
      status: "approved" | "revision_required";
      notes: string;
    }) =>
      reviewAdminAssignmentSubmission(submissionId, {
        status,
        review_notes: notes.trim() ? notes.trim() : null,
      }),
    onSuccess: () => {
      toast.success("Review submission berhasil disimpan");
      queryClient.invalidateQueries({
        queryKey: ["admin", "course-activity", "assignment-review", selectedOfferingId],
      });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        toast.error(error.message);
        return;
      }

      toast.error("Gagal menyimpan review submission");
    },
  });

  const handleOfferingChange = (value: string | null) => {
    setSearchKeyword("");
    setPage(1);
    setStatusFilter("all");
    setAssignmentFilter("all");
    setReviewDraft({ submissionId: null, notes: "" });

    const nextParams = new URLSearchParams(searchParams.toString());

    if (!value) {
      nextParams.delete("offeringId");
      nextParams.delete("submissionId");
    } else {
      nextParams.set("offeringId", value);
      nextParams.delete("submissionId");
    }

    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  };

  const handleSelectSubmission = (submissionId: number) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("submissionId", String(submissionId));
    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
  };

  const handleSubmitReview = (status: "approved" | "revision_required") => {
    if (!selectedSubmission) {
      return;
    }

    reviewMutation.mutate({
      submissionId: selectedSubmission.id,
      status,
      notes: reviewNotes,
    });
  };

  return (
    <section className="space-y-5">
      <AdminPageHeader
        title="Assignment Review"
        description="Tinjau submission assignment per offering tanpa harus masuk ke detail academic period. Halaman ini ditujukan untuk workflow harian admin dan instructor."
      />

      <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-[var(--foreground)]">
            <ClipboardList className="size-5" />
            <span>Pilih Offering</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select value={selectedOfferingId ? String(selectedOfferingId) : undefined} onValueChange={handleOfferingChange}>
            <SelectTrigger className="w-full border-[var(--border)] bg-[var(--card)]">
              <SelectValue>{selectedOfferingLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {offeringsQuery.data?.map((offering) => (
                <SelectItem key={offering.id} value={String(offering.id)}>
                  {buildOfferingOptionLabel(offering)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {activePeriodLabel ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              Menampilkan offering dari period aktif <span className="font-medium text-[var(--foreground)]">{activePeriodLabel}</span>.
            </p>
          ) : null}

          {selectedOffering ? (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--muted-foreground)]">
              <p>
                Course: <span className="font-medium text-[var(--foreground)]">{selectedOffering.course?.title ?? "-"}</span>
              </p>
              <p>
                Academic Period: <span className="font-medium text-[var(--foreground)]">{selectedOffering.academic_period?.name ?? selectedOffering.academic_period?.code ?? "-"}</span>
              </p>
            </div>
          ) : null}

          {activePeriodsQuery.isLoading || offeringsQuery.isLoading || selectedOfferingQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
              <Loader2 className="size-4 animate-spin" />
              Memuat daftar offering...
            </div>
          ) : null}

          {activePeriodsQuery.isError ? (
            <p className="text-sm text-[var(--danger-soft-foreground)]">Academic period aktif belum bisa dimuat.</p>
          ) : null}

          {offeringsQuery.isError ? (
            <p className="text-sm text-[var(--danger-soft-foreground)]">Daftar offering belum bisa dimuat.</p>
          ) : null}

          {!activePeriodsQuery.isLoading && !activePeriodsQuery.isError && !hasActivePeriod ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              Belum ada academic period yang aktif.
            </p>
          ) : null}

          {!activePeriodsQuery.isLoading && !offeringsQuery.isLoading && !offeringsQuery.isError && hasActivePeriod && !hasOfferingOptions ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              Belum ada offering yang tersedia untuk assignment review.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {selectedOfferingId ? (
        <div className="space-y-4">
          <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
            <CardHeader className="gap-3 pb-2">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base font-semibold text-[var(--foreground)]">
                    <ClipboardList className="size-5" />
                    <span>Assignment Review</span>
                  </CardTitle>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                    Review submission assignment hanya untuk student di offering ini.
                  </p>
                </div>

                <Button render={<Link href={courseMasterHref} />} type="button" variant="outline">
                  <Layers3 className="size-4" />
                  <span>Lihat Course Master</span>
                </Button>
              </div>
            </CardHeader>

            <CardContent className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_16rem_10rem_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
                <Input
                  value={searchKeyword}
                  onChange={(event) => {
                    setSearchKeyword(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Cari student, assignment, atau isi submission"
                  className="pl-9"
                />
              </div>

              <Select
                value={assignmentFilter}
                onValueChange={(value) => {
                  setAssignmentFilter(value ?? "all");
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full min-w-[12rem]">
                  <SelectValue>
                    {() => (
                      <span>
                        {assignmentFilter === "all"
                          ? "Semua assignment"
                          : curriculumAssignments.find((assignment) => String(assignment.id) === assignmentFilter)?.title ??
                            "Semua assignment"}
                      </span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua assignment</SelectItem>
                  {curriculumAssignments.map((assignment) => (
                    <SelectItem key={assignment.id} value={String(assignment.id)}>
                      {assignment.title ?? `Assignment #${assignment.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value ?? "all");
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full min-w-[12rem]">
                  <SelectValue>
                    {() => (
                      <span>
                        {statusFilter === "all"
                          ? "Semua status"
                          : statusFilter === "submitted"
                            ? "Submitted"
                            : statusFilter === "revision_required"
                              ? "Revision Required"
                              : "Approved"}
                      </span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua status</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="revision_required">Revision Required</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                </SelectContent>
              </Select>

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setAssignmentFilter("all");
                  setStatusFilter("all");
                  setSearchKeyword("");
                  setPage(1);
                }}
              >
                Reset
              </Button>

              <Button type="button" variant="outline" onClick={() => submissionsQuery.refetch()}>
                <RefreshCcw className="size-4" />
                <span>Refresh</span>
              </Button>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-[var(--foreground)]">Daftar Submission</CardTitle>
              </CardHeader>
              <CardContent className="space-y-0 p-0">
                {submissionsQuery.isLoading ? (
                  <div className="flex items-center gap-2 p-5 text-sm text-[var(--muted-foreground)]">
                    <Loader2 className="size-4 animate-spin" />
                    Memuat submission assignment...
                  </div>
                ) : submissionsQuery.isError ? (
                  <div className="p-5 text-sm text-[var(--danger-soft-foreground)]">
                    Gagal memuat daftar submission assignment.
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead>Assignment</TableHead>
                          <TableHead>Attempt</TableHead>
                          <TableHead>Submitted At</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Reviewer</TableHead>
                          <TableHead className="w-[7rem]">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {submissionRows.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="py-8 text-center text-sm text-[var(--muted-foreground)]">
                              Belum ada submission untuk filter yang dipilih.
                            </TableCell>
                          </TableRow>
                        ) : (
                          submissionRows.map((submission) => (
                            <TableRow
                              key={submission.id}
                              className={
                                submission.id === effectiveSelectedSubmissionId ? "bg-[var(--surface-soft)]" : undefined
                              }
                            >
                              <TableCell>
                                <div className="space-y-1">
                                  <p className="font-medium text-[var(--foreground)]">{submission.user?.fullname ?? "-"}</p>
                                  <p className="text-xs text-[var(--muted-foreground)]">{submission.user?.email ?? "-"}</p>
                                </div>
                              </TableCell>
                              <TableCell>{submission.assignment?.title ?? "-"}</TableCell>
                              <TableCell>Attempt #{submission.attempt_no ?? "-"}</TableCell>
                              <TableCell>{formatDateTime(submission.submitted_at)}</TableCell>
                              <TableCell>
                                <StatusBadge value={formatAssignmentReviewStatus(submission.status)} />
                              </TableCell>
                              <TableCell>{submission.reviewer_name ?? "-"}</TableCell>
                              <TableCell>
                                <Button type="button" variant="outline" size="sm" onClick={() => handleSelectSubmission(submission.id)}>
                                  Pilih
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>

                    {submissionRows.length > 0 ? (
                      <AdminPagination meta={submissionMeta} isLoading={submissionsQuery.isFetching} onPageChange={setPage} />
                    ) : null}
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-[var(--foreground)]">Panel Review</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!selectedSubmission ? (
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] p-4 text-sm text-[var(--muted-foreground)]">
                    Pilih submission dari daftar di kiri untuk melihat detail dan memberi review.
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] p-3">
                        <p className="text-xs text-[var(--muted-foreground)]">Student</p>
                        <p className="mt-1 font-medium text-[var(--foreground)]">{selectedSubmission.user?.fullname ?? "-"}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">{selectedSubmission.user?.email ?? "-"}</p>
                      </div>

                      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] p-3">
                        <p className="text-xs text-[var(--muted-foreground)]">Assignment</p>
                        <p className="mt-1 font-medium text-[var(--foreground)]">
                          {selectedSubmission.assignment?.title ?? "-"}
                        </p>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          Section: {selectedSubmission.assignment?.section_title ?? "-"}
                        </p>
                      </div>

                      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] p-3">
                        <p className="text-xs text-[var(--muted-foreground)]">Status Submission</p>
                        <div className="mt-1">
                          <StatusBadge value={formatAssignmentReviewStatus(selectedSubmission.status)} />
                        </div>
                        <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                          Attempt #{selectedSubmission.attempt_no ?? "-"} | Submitted {formatDateTime(selectedSubmission.submitted_at)}
                        </p>
                      </div>

                      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] p-3">
                        <p className="text-xs text-[var(--muted-foreground)]">Enrollment Snapshot</p>
                        <p className="mt-1 font-medium text-[var(--foreground)]">
                          Progress {formatProgress(selectedSubmission.enrollment?.progress)}
                        </p>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          Status: {selectedSubmission.enrollment?.status ? toStatusLabel(selectedSubmission.enrollment.status) : "-"}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 rounded-lg border border-[var(--border)] p-4">
                      <p className="text-sm font-semibold text-[var(--foreground)]">Isi Submission</p>
                      <div className="rounded-md border border-[var(--border)] bg-[var(--surface-soft)] p-3 text-sm text-[var(--foreground)]">
                        {selectedSubmission.submission_text?.trim() ? selectedSubmission.submission_text : "Tidak ada submission text."}
                      </div>
                      <div className="text-sm">
                        <span className="font-medium text-[var(--foreground)]">Attachment:</span>{" "}
                        {selectedSubmission.attachment_url ? (
                          <a
                            href={resolvePublicFileUrl(selectedSubmission.attachment_url) ?? selectedSubmission.attachment_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[var(--primary)] underline-offset-2 hover:underline"
                          >
                            Buka lampiran
                          </a>
                        ) : (
                          <span className="text-[var(--muted-foreground)]">Tidak ada lampiran.</span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="review-notes">Catatan Review</Label>
                      <Textarea
                        id="review-notes"
                        value={reviewNotes}
                        onChange={(event) =>
                          setReviewDraft({
                            submissionId: effectiveSelectedSubmissionId,
                            notes: event.target.value,
                          })
                        }
                        placeholder="Tulis feedback singkat untuk student..."
                        className="min-h-28 border-[var(--border)] bg-[var(--card)]"
                        disabled={selectedSubmission.status === "approved"}
                      />
                      {selectedSubmission.review_notes ? (
                        <p className="text-xs text-[var(--muted-foreground)]">
                          Catatan sebelumnya: {selectedSubmission.review_notes}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        onClick={() => handleSubmitReview("approved")}
                        disabled={reviewMutation.isPending || selectedSubmission.status === "approved"}
                        className="bg-emerald-600 text-white hover:bg-emerald-700"
                      >
                        {reviewMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                        <span>Approve</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleSubmitReview("revision_required")}
                        disabled={reviewMutation.isPending || selectedSubmission.status === "approved"}
                        className="border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
                      >
                        {reviewMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                        <span>Perlu Revisi</span>
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <Card className="border border-dashed border-[var(--border)] bg-[var(--card)] shadow-sm">
          <CardContent className="py-10 text-center text-sm text-[var(--muted-foreground)]">
            {!activePeriodsQuery.isLoading && !activePeriodsQuery.isError && !hasActivePeriod
              ? "Belum ada academic period aktif untuk membuka assignment review."
              : hasOfferingOptions || offeringsQuery.isLoading
                ? "Menyiapkan assignment review..."
                : "Belum ada offering yang bisa dibuka untuk assignment review."}
          </CardContent>
        </Card>
      )}
    </section>
  );
}
