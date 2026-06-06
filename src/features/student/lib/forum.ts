export function buildStudentEnrollmentForumListHref(enrollmentId: number): string {
  return `/student/enrollments/${enrollmentId}/forum`;
}

export function buildStudentEnrollmentForumDetailHref(enrollmentId: number, postId: number): string {
  return `/student/enrollments/${enrollmentId}/forum/${postId}`;
}
