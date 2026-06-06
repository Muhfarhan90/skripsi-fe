import { notFound } from "next/navigation";
import { AdminUserFormPage } from "@/features/admin/components/user-form-page";

interface AdminStudentEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminStudentEditPage({ params }: AdminStudentEditPageProps) {
  const { id } = await params;
  const userId = Number(id);

  if (!Number.isInteger(userId) || userId <= 0) {
    notFound();
  }

  return <AdminUserFormPage key={`edit-student-${userId}`} mode="edit" userId={userId} scope="student" />;
}
