import type { StoreEnrollment, StoreOrder } from "@/types/store";

function hasActiveEnrollmentStatus(status: string | null | undefined): boolean {
  return ["pending", "active", "completed"].includes((status ?? "").toLowerCase());
}

function isPendingTransactionStillActionable(order: StoreOrder): boolean {
  const latestTransaction = [...(order.transactions ?? [])]
    .sort((left, right) => right.id - left.id)[0];

  if (!latestTransaction) {
    return true;
  }

  if (latestTransaction.status !== "pending") {
    return false;
  }

  if (!latestTransaction.expired_at) {
    return true;
  }

  return new Date(latestTransaction.expired_at).getTime() > Date.now();
}

export function buildHiddenCatalogCourseIds(
  enrollments: StoreEnrollment[] | undefined,
  pendingOrders: StoreOrder[] | undefined,
): Set<number> {
  const hiddenCourseIds = new Set<number>();

  for (const enrollment of enrollments ?? []) {
    if (typeof enrollment.course_id === "number" && hasActiveEnrollmentStatus(enrollment.status)) {
      hiddenCourseIds.add(enrollment.course_id);
    }
  }

  for (const order of pendingOrders ?? []) {
    if (order.status !== "pending" || !isPendingTransactionStillActionable(order)) {
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
