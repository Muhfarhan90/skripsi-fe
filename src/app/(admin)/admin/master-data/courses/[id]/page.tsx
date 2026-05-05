import { notFound } from "next/navigation";
import { AdminCourseFormPage } from "@/features/admin/components/course-form-page";

interface AdminCourseDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminCourseDetailPage({ params }: AdminCourseDetailPageProps) {
  const { id } = await params;
  const courseId = Number(id);

  if (!Number.isInteger(courseId) || courseId <= 0) {
    notFound();
  }

  return <AdminCourseFormPage key={`detail-course-${courseId}`} mode="edit" courseId={courseId} />;
}
