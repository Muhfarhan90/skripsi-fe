import { redirect } from "next/navigation";
import { isExactAdminRole } from "@/features/auth/lib/roles";
import { getServerCurrentUser } from "@/features/auth/lib/server";
import { AdminCourseReviewsPage } from "@/features/admin/components/course-reviews-page";

export default async function AdminCourseReviewsRoute() {
  const user = await getServerCurrentUser();

  if (!user) {
    redirect("/login?redirect=/admin/course-reviews");
  }

  if (!isExactAdminRole(user.role_name, user.role_id)) {
    redirect("/admin");
  }

  return <AdminCourseReviewsPage />;
}
