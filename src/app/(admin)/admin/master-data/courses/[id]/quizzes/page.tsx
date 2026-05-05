import { notFound, redirect } from "next/navigation";

interface AdminCourseQuizzesPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminCourseQuizzesPage({ params }: AdminCourseQuizzesPageProps) {
  const { id } = await params;
  const courseId = Number(id);

  if (!Number.isInteger(courseId) || courseId <= 0) {
    notFound();
  }

  redirect(`/admin/master-data/courses/${courseId}`);
}
