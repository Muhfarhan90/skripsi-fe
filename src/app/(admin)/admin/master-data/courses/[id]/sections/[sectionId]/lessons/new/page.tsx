import { notFound } from "next/navigation";
import { CourseLessonEditorPage } from "@/features/admin/components/course-lesson-editor-page";

interface AdminCourseLessonCreatePageProps {
  params: Promise<{ id: string; sectionId: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}

export default async function AdminCourseLessonCreatePage({
  params,
  searchParams,
}: AdminCourseLessonCreatePageProps) {
  const [{ id, sectionId }, query] = await Promise.all([params, searchParams]);
  const courseId = Number(id);
  const parsedSectionId = Number(sectionId);

  if (!Number.isInteger(courseId) || courseId <= 0 || !Number.isInteger(parsedSectionId) || parsedSectionId <= 0) {
    notFound();
  }

  return (
    <CourseLessonEditorPage
      courseId={courseId}
      sectionId={parsedSectionId}
      returnTo={query.returnTo}
    />
  );
}

