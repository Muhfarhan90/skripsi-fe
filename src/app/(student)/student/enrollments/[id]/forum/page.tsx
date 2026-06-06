import { notFound } from "next/navigation";
import { StudentEnrollmentForumPage } from "@/features/student/components/student-enrollment-forum-page";

interface StudentEnrollmentForumPageRouteProps {
  params: Promise<{ id: string }>;
}

export default async function StudentEnrollmentForumPageRoute({
  params,
}: StudentEnrollmentForumPageRouteProps) {
  const { id } = await params;
  const enrollmentId = Number(id);

  if (!Number.isInteger(enrollmentId) || enrollmentId <= 0) {
    notFound();
  }

  return <StudentEnrollmentForumPage enrollmentId={enrollmentId} />;
}
