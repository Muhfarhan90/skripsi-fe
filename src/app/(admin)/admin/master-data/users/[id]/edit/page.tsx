import { notFound } from "next/navigation";
import { AdminUserFormPage } from "@/features/admin/components/user-form-page";

interface AdminUserEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminUserEditPage({ params }: AdminUserEditPageProps) {
  const { id } = await params;
  const userId = Number(id);

  if (!Number.isInteger(userId) || userId <= 0) {
    notFound();
  }

  return <AdminUserFormPage key={`edit-user-${userId}`} mode="edit" userId={userId} />;
}
