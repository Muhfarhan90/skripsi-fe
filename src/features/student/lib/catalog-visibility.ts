import type { StoreEnrollment, StoreOrder } from "@/types/store";

export function buildHiddenCatalogCourseIds(
  enrollments: StoreEnrollment[] | undefined,
  pendingOrders: StoreOrder[] | undefined,
): Set<number> {
  const hiddenCourseIds = new Set<number>();

  for (const enrollment of enrollments ?? []) {
    if (enrollment.status !== "cancelled") {
      hiddenCourseIds.add(enrollment.course_id);
    }
  }

  for (const order of pendingOrders ?? []) {
    if (order.status !== "pending") {
      continue;
    }

    for (const item of order.items ?? []) {
      const courseId = item.course_id ?? item.course?.id ?? item.course_offering?.course_id ?? null;
      if (typeof courseId === "number" && courseId > 0) {
        hiddenCourseIds.add(courseId);
      }
    }
  }

  return hiddenCourseIds;
}
