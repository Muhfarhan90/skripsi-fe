"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCw, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  createEmptyAdminPaginationMeta,
  deleteAdminCourseReview,
  getAdminAcademicPeriods,
  getAdminCourseById,
  getAdminCourseOfferings,
  listAdminCourseReviews,
  type AdminCourseReview,
} from "@/features/admin/api/master-api";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { AdminPagination } from "@/features/admin/components/admin-pagination";
import { buildCourseOptionsFromOfferings, parsePositiveIntegerParam } from "@/features/admin/lib/course-activity";
import { formatDateTime } from "@/features/admin/lib/offering-utils";
import { ApiError } from "@/lib/api/client";

export function AdminCourseReviewsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const queryClient = useQueryClient();
  const selectedCourseId = parsePositiveIntegerParam(searchParams.get("courseId"));
  const highlightedReviewId = parsePositiveIntegerParam(searchParams.get("reviewId"));
  const [page, setPage] = useState(1);
  const [reviewToDelete, setReviewToDelete] = useState<AdminCourseReview | null>(null);

  const activePeriodsQuery = useQuery({
    queryKey: ["admin", "course-reviews", "active-period"],
    queryFn: () => getAdminAcademicPeriods({ is_active: true }),
    staleTime: 60_000,
  });

  const activePeriod = activePeriodsQuery.data?.[0] ?? null;
  const activePeriodId = activePeriod?.id ?? null;
  const activePeriodLabel = activePeriod?.name ?? activePeriod?.code ?? null;

  const offeringsQuery = useQuery({
    queryKey: ["admin", "course-reviews", "course-options", activePeriodId],
    queryFn: () => getAdminCourseOfferings({ academic_period_id: activePeriodId as number }),
    enabled: activePeriodId !== null,
  });

  const selectedCourseQuery = useQuery({
    queryKey: ["admin", "course-reviews", "course", selectedCourseId],
    queryFn: () => getAdminCourseById(selectedCourseId as number),
    enabled: selectedCourseId !== null,
  });

  const reviewsQuery = useQuery({
    queryKey: ["admin", "course-reviews", selectedCourseId, page],
    queryFn: () => listAdminCourseReviews(selectedCourseId as number, { page }),
    enabled: selectedCourseId !== null,
  });

  const courseOptions = useMemo(
    () => buildCourseOptionsFromOfferings(offeringsQuery.data ?? []),
    [offeringsQuery.data],
  );
  const selectedCourse = courseOptions.find((course) => course.id === selectedCourseId) ?? null;
  const courseReviewRows = reviewsQuery.data?.items ?? [];
  const courseReviewMeta = reviewsQuery.data?.meta ?? createEmptyAdminPaginationMeta(page);
  const selectedCourseLabel =
    selectedCourse?.title ?? selectedCourseQuery.data?.title ?? "Pilih course untuk membuka review";
  const selectedInstructorName =
    selectedCourse?.instructorName ?? selectedCourseQuery.data?.instructor_name ?? null;
  const hasCourseOptions = courseOptions.length > 0;
  const hasActivePeriod = activePeriodId !== null;

  useEffect(() => {
    if (selectedCourseId !== null) {
      return;
    }

    if (!hasActivePeriod) {
      return;
    }

    const defaultCourseId = courseOptions[0]?.id;
    if (!defaultCourseId) {
      return;
    }

    const nextParams = new URLSearchParams(searchParamsString);
    nextParams.set("courseId", String(defaultCourseId));
    nextParams.delete("reviewId");
    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
  }, [courseOptions, hasActivePeriod, pathname, router, searchParamsString, selectedCourseId]);

  const deleteReviewMutation = useMutation({
    mutationFn: (reviewId: number) => deleteAdminCourseReview(selectedCourseId as number, reviewId),
    onSuccess: (message) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "course-reviews", selectedCourseId] });
      toast.success(message || "Review berhasil dihapus");
      setReviewToDelete(null);
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        toast.error(error.message);
        return;
      }

      toast.error("Review belum bisa dihapus.");
    },
  });

  const handleCourseChange = (value: string | null) => {
    setPage(1);

    const nextParams = new URLSearchParams(searchParams.toString());

    if (!value) {
      nextParams.delete("courseId");
      nextParams.delete("reviewId");
    } else {
      nextParams.set("courseId", value);
      nextParams.delete("reviewId");
    }

    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  };

  return (
    <section className="space-y-5">
      <AdminPageHeader
        title="Course Reviews"
        description="Moderasi rating dan ulasan student per course. Halaman ini hanya tersedia untuk admin platform."
      />

      <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-[var(--foreground)]">
            <Star className="size-5 text-amber-500" />
            <span>Pilih Course</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select value={selectedCourseId ? String(selectedCourseId) : undefined} onValueChange={handleCourseChange}>
            <SelectTrigger className="w-full border-[var(--border)] bg-[var(--card)]">
              <SelectValue>{selectedCourseLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {courseOptions.map((course) => (
                <SelectItem key={course.id} value={String(course.id)}>
                  {course.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {activePeriodLabel ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              Menampilkan course dari period aktif <span className="font-medium text-[var(--foreground)]">{activePeriodLabel}</span>.
            </p>
          ) : null}

          {selectedInstructorName ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              Instructor: <span className="font-medium text-[var(--foreground)]">{selectedInstructorName}</span>
            </p>
          ) : null}

          {activePeriodsQuery.isLoading || offeringsQuery.isLoading || selectedCourseQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
              <Loader2 className="size-4 animate-spin" />
              Memuat daftar course...
            </div>
          ) : null}

          {activePeriodsQuery.isError ? (
            <p className="text-sm text-[var(--danger-soft-foreground)]">Academic period aktif belum bisa dimuat.</p>
          ) : null}

          {offeringsQuery.isError ? (
            <p className="text-sm text-[var(--danger-soft-foreground)]">Daftar course belum bisa dimuat.</p>
          ) : null}

          {!activePeriodsQuery.isLoading && !activePeriodsQuery.isError && !hasActivePeriod ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              Belum ada academic period yang aktif.
            </p>
          ) : null}

          {!activePeriodsQuery.isLoading && !offeringsQuery.isLoading && !offeringsQuery.isError && hasActivePeriod && !hasCourseOptions ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              Belum ada course yang tersedia untuk moderasi review.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {selectedCourseId ? (
        <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <CardHeader className="gap-3 pb-2">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="inline-flex items-center gap-2 text-base font-semibold text-[var(--foreground)]">
                  <Star className="size-4 text-amber-500" />
                  <span>Reviews Course</span>
                </CardTitle>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  Pantau rating dan ulasan student untuk course ini.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => reviewsQuery.refetch()}
                disabled={reviewsQuery.isFetching}
                className="border-[var(--border)] bg-[var(--card)]"
              >
                {reviewsQuery.isFetching ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                <span>Refresh</span>
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {reviewsQuery.isLoading ? (
              <div className="flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--card)] px-4 py-4 text-sm text-[var(--muted-foreground)]">
                <Loader2 className="size-4 animate-spin" />
                Memuat review course...
              </div>
            ) : null}

            {reviewsQuery.isError ? (
              <div className="rounded-md border border-[var(--danger-soft-border)] bg-[var(--danger-soft-bg)] px-4 py-4 text-sm text-[var(--danger-soft-foreground)]">
                Review course belum bisa dimuat.
              </div>
            ) : null}

            {reviewsQuery.isSuccess && courseReviewRows.length === 0 ? (
              <div className="rounded-md border border-dashed border-[var(--border)] bg-[var(--card)] px-4 py-8 text-center text-sm text-[var(--muted-foreground)]">
                Belum ada review untuk course ini.
              </div>
            ) : null}

            {courseReviewRows.length > 0 ? (
              <div className="space-y-3">
                {courseReviewRows.map((review) => {
                  const isHighlighted = highlightedReviewId === review.id;
                  const reviewerName = review.user?.fullname ?? `Student #${review.user_id}`;
                  const reviewerEmail = review.user?.email ?? null;

                  return (
                    <div
                      key={review.id}
                      className={[
                        "rounded-md border bg-[var(--card)] p-4",
                        isHighlighted ? "border-[var(--primary)] ring-2 ring-[var(--primary)]/15" : "border-[var(--border)]",
                      ].join(" ")}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[var(--foreground)]">{reviewerName}</p>
                          {reviewerEmail ? (
                            <p className="text-xs text-[var(--muted-foreground)]">{reviewerEmail}</p>
                          ) : null}
                          <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-amber-600">
                            <Star className="size-3.5 fill-current" />
                            <span>{review.rating}/5</span>
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[var(--muted-foreground)]">{formatDateTime(review.created_at)}</span>
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon-sm"
                            onClick={() => setReviewToDelete(review)}
                            className="border-[var(--danger-soft-border)] bg-[var(--danger-soft-bg)] text-[var(--danger-soft-foreground)] hover:opacity-90"
                            aria-label={`Hapus review ${reviewerName}`}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>

                      <p className="mt-3 whitespace-pre-line text-sm leading-6 text-[var(--muted-foreground)]">
                        {review.review?.trim() || "Tidak ada komentar tertulis."}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : null}

            {courseReviewMeta.total > 0 ? (
              <AdminPagination meta={courseReviewMeta} isLoading={reviewsQuery.isFetching} onPageChange={setPage} />
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <Card className="border border-dashed border-[var(--border)] bg-[var(--card)] shadow-sm">
          <CardContent className="py-10 text-center text-sm text-[var(--muted-foreground)]">
            {!activePeriodsQuery.isLoading && !activePeriodsQuery.isError && !hasActivePeriod
              ? "Belum ada academic period aktif untuk membuka review student."
              : hasCourseOptions || offeringsQuery.isLoading || selectedCourseQuery.isLoading
                ? "Menyiapkan daftar review course..."
                : "Belum ada course yang bisa dibuka untuk review student."}
          </CardContent>
        </Card>
      )}

      <ConfirmAlertDialog
        open={reviewToDelete !== null}
        title="Hapus Review"
        description={
          reviewToDelete
            ? `Review dari "${reviewToDelete.user?.fullname ?? `Student #${reviewToDelete.user_id}`}" akan dihapus. Aksi ini tidak dapat dibatalkan.`
            : ""
        }
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        confirmTone="danger"
        isPending={deleteReviewMutation.isPending}
        onClose={() => {
          if (deleteReviewMutation.isPending) return;
          setReviewToDelete(null);
        }}
        onConfirm={() => {
          if (!reviewToDelete) return;
          deleteReviewMutation.mutate(reviewToDelete.id);
        }}
      />
    </section>
  );
}
