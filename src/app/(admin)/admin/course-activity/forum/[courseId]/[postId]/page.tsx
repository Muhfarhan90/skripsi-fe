import { notFound } from "next/navigation";
import { AdminCourseActivityForumDetailPage } from "@/features/admin/components/course-activity-forum-detail-page";

interface AdminCourseActivityForumDetailRouteProps {
  params: Promise<{ courseId: string; postId: string }>;
}

export default async function AdminCourseActivityForumDetailRoute({
  params,
}: AdminCourseActivityForumDetailRouteProps) {
  const { courseId: courseIdParam, postId: postIdParam } = await params;
  const courseId = Number(courseIdParam);
  const postId = Number(postIdParam);

  if (!Number.isInteger(courseId) || courseId <= 0 || !Number.isInteger(postId) || postId <= 0) {
    notFound();
  }

  return <AdminCourseActivityForumDetailPage courseId={courseId} postId={postId} />;
}
