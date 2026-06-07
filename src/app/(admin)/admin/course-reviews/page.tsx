"use client";

import { ExactAdminGuard } from "@/components/shared/exact-admin-guard";
import { AdminCourseReviewsPage } from "@/features/admin/components/course-reviews-page";

export default function AdminCourseReviewsRoute() {
  return (
    <ExactAdminGuard>
      <AdminCourseReviewsPage />
    </ExactAdminGuard>
  );
}
