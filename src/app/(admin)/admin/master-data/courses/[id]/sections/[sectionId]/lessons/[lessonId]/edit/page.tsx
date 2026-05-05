import { notFound } from "next/navigation";
import { CourseLessonEditorPage } from "@/features/admin/components/course-lesson-editor-page";

interface AdminCourseLessonEditPageProps {
  params: Promise<{ id: string; sectionId: string; lessonId: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}

export default async function AdminCourseLessonEditPage({
  params,
  searchParams,
}: AdminCourseLessonEditPageProps) {
  const [{ id, sectionId, lessonId }, query] = await Promise.all([params, searchParams]);
  const courseId = Number(id);
  const parsedSectionId = Number(sectionId);
  const parsedLessonId = Number(lessonId);

  if (
    !Number.isInteger(courseId) ||
    courseId <= 0 ||
    !Number.isInteger(parsedSectionId) ||
    parsedSectionId <= 0 ||
    !Number.isInteger(parsedLessonId) ||
    parsedLessonId <= 0
  ) {
    notFound();
  }

  return (
    <CourseLessonEditorPage
      courseId={courseId}
      sectionId={parsedSectionId}
      lessonId={parsedLessonId}
      returnTo={query.returnTo}
    />
  );
}

