import { notFound } from "next/navigation";
import { StudentEnrollmentForumDetailPage } from "@/features/student/components/student-enrollment-forum-detail-page";

interface StudentEnrollmentForumDetailPageRouteProps {
  params: Promise<{ id: string; postId: string }>;
}

export default async function StudentEnrollmentForumDetailPageRoute({
  params,
}: StudentEnrollmentForumDetailPageRouteProps) {
  const { id, postId } = await params;
  const enrollmentId = Number(id);
  const parsedPostId = Number(postId);

  if (!Number.isInteger(enrollmentId) || enrollmentId <= 0 || !Number.isInteger(parsedPostId) || parsedPostId <= 0) {
    notFound();
  }

  return <StudentEnrollmentForumDetailPage enrollmentId={enrollmentId} postId={parsedPostId} />;
}
