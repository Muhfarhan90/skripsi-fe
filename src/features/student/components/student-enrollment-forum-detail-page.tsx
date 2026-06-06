"use client";

import { useQuery } from "@tanstack/react-query";
import { getStudentEnrollmentById } from "@/features/student/api/store-api";
import { StudentCourseForumDetailPage } from "@/features/student/components/student-course-forum-detail-page";

interface StudentEnrollmentForumDetailPageProps {
  enrollmentId: number;
  postId: number;
}

export function StudentEnrollmentForumDetailPage({
  enrollmentId,
  postId,
}: StudentEnrollmentForumDetailPageProps) {
  const enrollmentQuery = useQuery({
    queryKey: ["student", "enrollment", enrollmentId],
    queryFn: () => getStudentEnrollmentById(enrollmentId),
    enabled: Number.isFinite(enrollmentId) && enrollmentId > 0,
  });

  if (enrollmentQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Memuat detail forum...</p>;
  }

  if (enrollmentQuery.isError || !enrollmentQuery.data) {
    return <p className="text-sm text-red-600">Forum kelas tidak ditemukan.</p>;
  }

  const enrollment = enrollmentQuery.data;
  const courseId = enrollment.course?.id ?? enrollment.course_id;

  if (!courseId) {
    return <p className="text-sm text-red-600">Course untuk forum ini tidak ditemukan.</p>;
  }

  return (
    <StudentCourseForumDetailPage
      enrollmentId={enrollmentId}
      courseId={courseId}
      courseTitle={enrollment.course?.title ?? `Course #${courseId}`}
      postId={postId}
    />
  );
}
