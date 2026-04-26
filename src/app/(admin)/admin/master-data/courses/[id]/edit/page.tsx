import { notFound } from "next/navigation";
import { AdminCourseFormPage } from "@/features/admin/components/course-form-page";

interface AdminCourseEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminCourseEditPage({ params }: AdminCourseEditPageProps) {
  const { id } = await params;
  const courseId = Number(id);

  if (!Number.isInteger(courseId) || courseId <= 0) {
    notFound();
  }

  return <AdminCourseFormPage key={`edit-course-${courseId}`} mode="edit" courseId={courseId} />;
}
