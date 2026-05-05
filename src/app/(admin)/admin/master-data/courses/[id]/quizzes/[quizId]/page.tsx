import { notFound } from "next/navigation";
import { QuizDetailPage } from "@/features/admin/components/quiz-detail-page";

interface AdminQuizDetailPageProps {
  params: Promise<{ id: string; quizId: string }>;
}

export default async function AdminQuizDetailPage({ params }: AdminQuizDetailPageProps) {
  const { id, quizId } = await params;
  const courseId = Number(id);
  const parsedQuizId = Number(quizId);

  if (!Number.isInteger(courseId) || courseId <= 0 || !Number.isInteger(parsedQuizId) || parsedQuizId <= 0) {
    notFound();
  }

  return <QuizDetailPage courseId={courseId} quizId={parsedQuizId} />;
}
