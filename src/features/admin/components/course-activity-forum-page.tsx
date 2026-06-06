"use client";

import { useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Loader2, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  getAdminAcademicPeriods,
  getAdminCourseById,
  getAdminCourseOfferingById,
  getAdminCourseOfferings,
} from "@/features/admin/api/master-api";
import { AdminCourseActivityForumListPanel } from "@/features/admin/components/admin-course-activity-forum-list-panel";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import {
  buildAdminCourseActivityForumDetailHref,
  buildAdminCourseActivityForumListHref,
  buildCourseOptionsFromOfferings,
  parsePositiveIntegerParam,
} from "@/features/admin/lib/course-activity";

export function AdminCourseActivityForumPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedCourseIdParam = parsePositiveIntegerParam(searchParams.get("courseId"));
  const selectedOfferingIdParam = parsePositiveIntegerParam(searchParams.get("offeringId"));
  const highlightedPostId = parsePositiveIntegerParam(searchParams.get("forumPostId"));

  const activePeriodsQuery = useQuery({
    queryKey: ["admin", "course-activity", "forum", "active-period"],
    queryFn: () => getAdminAcademicPeriods({ is_active: true }),
    staleTime: 60_000,
  });

  const activePeriod = activePeriodsQuery.data?.[0] ?? null;
  const activePeriodId = activePeriod?.id ?? null;
  const activePeriodLabel = activePeriod?.name ?? activePeriod?.code ?? null;

  const offeringsQuery = useQuery({
    queryKey: ["admin", "course-activity", "forum", "offering-options", activePeriodId],
    queryFn: () => getAdminCourseOfferings({ academic_period_id: activePeriodId as number }),
    enabled: activePeriodId !== null,
  });

  const selectedOfferingQuery = useQuery({
    queryKey: ["admin", "course-activity", "forum", "offering", selectedOfferingIdParam],
    queryFn: () => getAdminCourseOfferingById(selectedOfferingIdParam as number),
    enabled: selectedCourseIdParam === null && selectedOfferingIdParam !== null,
  });

  const selectedCourseQuery = useQuery({
    queryKey: ["admin", "course-activity", "forum", "course", selectedCourseIdParam],
    queryFn: () => getAdminCourseById(selectedCourseIdParam as number),
    enabled: selectedCourseIdParam !== null,
  });

  const courseOptions = useMemo(
    () => buildCourseOptionsFromOfferings(offeringsQuery.data ?? []),
    [offeringsQuery.data],
  );
  const selectedCourseId =
    selectedCourseIdParam ??
    selectedOfferingQuery.data?.course?.id ??
    selectedOfferingQuery.data?.course_id ??
    null;
  const selectedCourse = courseOptions.find((course) => course.id === selectedCourseId) ?? null;
  const selectedCourseTitle =
    selectedCourse?.title ?? selectedCourseQuery.data?.title ?? selectedOfferingQuery.data?.course?.title ?? "Course";
  const selectedCourseLabel =
    selectedCourse?.title ?? selectedCourseQuery.data?.title ?? "Pilih course untuk membuka forum";
  const selectedInstructorName =
    selectedCourse?.instructorName ?? selectedCourseQuery.data?.instructor_name ?? null;
  const hasCourseOptions = courseOptions.length > 0;
  const hasActivePeriod = activePeriodId !== null;
  const legacyCourseId =
    selectedOfferingQuery.data?.course?.id ?? selectedOfferingQuery.data?.course_id ?? null;

  useEffect(() => {
    if (selectedCourseIdParam !== null || selectedOfferingIdParam === null || !legacyCourseId) {
      return;
    }

    if (highlightedPostId) {
      router.replace(buildAdminCourseActivityForumDetailHref(legacyCourseId, highlightedPostId), {
        scroll: false,
      });
      return;
    }

    router.replace(buildAdminCourseActivityForumListHref(legacyCourseId), { scroll: false });
  }, [
    highlightedPostId,
    legacyCourseId,
    router,
    selectedCourseIdParam,
    selectedOfferingIdParam,
  ]);

  useEffect(() => {
    if (!selectedCourseId || !highlightedPostId) {
      return;
    }

    router.replace(buildAdminCourseActivityForumDetailHref(selectedCourseId, highlightedPostId), {
      scroll: false,
    });
  }, [highlightedPostId, router, selectedCourseId]);

  useEffect(() => {
    if (selectedCourseIdParam !== null || selectedOfferingIdParam !== null) {
      return;
    }

    if (!hasActivePeriod) {
      return;
    }

    const defaultCourseId = courseOptions[0]?.id;
    if (!defaultCourseId) {
      return;
    }

    router.replace(buildAdminCourseActivityForumListHref(defaultCourseId), { scroll: false });
  }, [courseOptions, hasActivePeriod, router, selectedCourseIdParam, selectedOfferingIdParam]);

  const handleCourseChange = (value: string | null) => {
    if (!value) {
      router.replace(buildAdminCourseActivityForumListHref(), { scroll: false });
      return;
    }

    router.replace(buildAdminCourseActivityForumListHref(Number(value)), { scroll: false });
  };

  return (
    <section className="space-y-5">
      <AdminPageHeader
        title="Forum"
        description="Pantau dan moderasi diskusi course tanpa masuk ke academic period. Forum tetap mengikuti course master dan dibagikan ke seluruh offering yang memakai course yang sama."
      />

      <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-[var(--foreground)]">
            <MessageSquare className="size-5" />
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

          {activePeriodsQuery.isLoading || offeringsQuery.isLoading || selectedOfferingQuery.isLoading || selectedCourseQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
              <Loader2 className="size-4 animate-spin" />
              Memuat daftar course activity...
            </div>
          ) : null}

          {activePeriodsQuery.isError ? (
            <p className="text-sm text-[var(--danger-soft-foreground)]">
              Academic period aktif belum bisa dimuat.
            </p>
          ) : null}

          {offeringsQuery.isError ? (
            <p className="text-sm text-[var(--danger-soft-foreground)]">
              Daftar course activity belum bisa dimuat.
            </p>
          ) : null}

          {!activePeriodsQuery.isLoading && !activePeriodsQuery.isError && !hasActivePeriod ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              Belum ada academic period yang aktif.
            </p>
          ) : null}

          {!activePeriodsQuery.isLoading && !offeringsQuery.isLoading && !offeringsQuery.isError && hasActivePeriod && !hasCourseOptions ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              Belum ada course yang tersedia untuk forum.
            </p>
          ) : null}
          {selectedInstructorName ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              Instructor: <span className="font-medium text-[var(--foreground)]">{selectedInstructorName}</span>
            </p>
          ) : null}
        </CardContent>
      </Card>

      {selectedCourseId ? (
        <AdminCourseActivityForumListPanel
          key={`course-forum-list-${selectedCourseId}`}
          courseId={selectedCourseId}
          courseTitle={selectedCourseTitle}
        />
      ) : (
        <Card className="border border-dashed border-[var(--border)] bg-[var(--card)] shadow-sm">
          <CardContent className="py-10 text-center text-sm text-[var(--muted-foreground)]">
            {!activePeriodsQuery.isLoading && !activePeriodsQuery.isError && !hasActivePeriod
              ? "Belum ada academic period aktif untuk membuka forum diskusi."
              : hasCourseOptions || offeringsQuery.isLoading || selectedOfferingQuery.isLoading || selectedCourseQuery.isLoading
                ? "Menyiapkan forum diskusi..."
                : "Belum ada course yang bisa dibuka untuk forum diskusi."}
          </CardContent>
        </Card>
      )}
    </section>
  );
}
