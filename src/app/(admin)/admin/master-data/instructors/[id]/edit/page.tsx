import { notFound } from "next/navigation";
import { AdminUserFormPage } from "@/features/admin/components/user-form-page";

interface AdminInstructorEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminInstructorEditPage({ params }: AdminInstructorEditPageProps) {
  const { id } = await params;
  const userId = Number(id);

  if (!Number.isInteger(userId) || userId <= 0) {
    notFound();
  }

  return <AdminUserFormPage key={`edit-instructor-${userId}`} mode="edit" userId={userId} scope="instructor" />;
}
