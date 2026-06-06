import type { AdminCourseOffering, AdminOfferingEnrollment } from "@/features/admin/api/master-api";
import { toStatusLabel } from "@/features/admin/lib/offering-utils";

export interface CourseActivityCourseOption {
  id: number;
  title: string;
  instructorName: string | null;
}

export function buildAdminCourseActivityForumListHref(courseId?: number | null): string {
  if (!courseId || !Number.isInteger(courseId) || courseId <= 0) {
    return "/admin/course-activity/forum";
  }

  return `/admin/course-activity/forum?courseId=${courseId}`;
}

export function buildAdminCourseActivityForumDetailHref(courseId: number, postId: number): string {
  return `/admin/course-activity/forum/${courseId}/${postId}`;
}

export function parsePositiveIntegerParam(value: string | null): number | null {
  if (!value) return null;

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function buildOfferingOptionLabel(offering: AdminCourseOffering): string {
  const courseTitle = offering.course?.title ?? `Course #${offering.course_id ?? offering.id}`;
  const periodLabel =
    offering.academic_period?.name ??
    offering.academic_period?.code ??
    (offering.academic_period_id ? `Period #${offering.academic_period_id}` : "Tanpa period");

  return `${courseTitle} - ${periodLabel}`;
}

export function buildCourseOptionsFromOfferings(offerings: AdminCourseOffering[]): CourseActivityCourseOption[] {
  const deduped = new Map<number, CourseActivityCourseOption>();

  offerings.forEach((offering) => {
    const course = offering.course;
    if (!course?.id) {
      return;
    }

    if (!deduped.has(course.id)) {
      deduped.set(course.id, {
        id: course.id,
        title: course.title,
        instructorName: course.instructor?.fullname ?? null,
      });
    }
  });

  return [...deduped.values()].sort((left, right) => left.title.localeCompare(right.title));
}

export function formatProgress(progress: number | null | undefined): string {
  return `${Math.max(0, Number(progress ?? 0))}%`;
}

export function formatAssignmentRequirementSummary(
  requirement: AdminOfferingEnrollment["assignment_requirement"] | null | undefined,
): string {
  if (!requirement) return "-";
  return `${requirement.approved_assignments}/${requirement.required_assignments}`;
}

export function formatRequirementStatus(
  requirement: AdminOfferingEnrollment["assignment_requirement"] | null | undefined,
): string {
  if (!requirement) return "Belum Ada";
  return requirement.is_satisfied ? "Terpenuhi" : "Belum Terpenuhi";
}

export function formatAssignmentReviewStatus(value?: string | null): string {
  return value ? toStatusLabel(value) : "-";
}
