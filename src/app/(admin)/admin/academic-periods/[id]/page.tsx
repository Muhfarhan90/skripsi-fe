import { notFound } from "next/navigation";
import { AcademicPeriodFormPage } from "@/features/admin/components/academic-period-form-page";

interface AdminAcademicPeriodDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminAcademicPeriodDetailPage({ params }: AdminAcademicPeriodDetailPageProps) {
  const { id } = await params;
  const periodId = Number(id);

  if (!Number.isInteger(periodId) || periodId <= 0) {
    notFound();
  }

  return <AcademicPeriodFormPage key={`edit-period-${periodId}`} mode="edit" periodId={periodId} />;
}
