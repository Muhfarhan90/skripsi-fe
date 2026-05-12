import { notFound } from "next/navigation";
import { AcademicPeriodFormPage } from "@/features/admin/components/academic-period-form-page";
import { getAcademicPeriodById } from "@/features/admin/data/offering-data";

interface AdminAcademicPeriodDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminAcademicPeriodDetailPage({ params }: AdminAcademicPeriodDetailPageProps) {
  const { id } = await params;
  const periodId = Number(id);

  if (!Number.isInteger(periodId) || periodId <= 0) {
    notFound();
  }

  if (!getAcademicPeriodById(periodId)) {
    notFound();
  }

  return <AcademicPeriodFormPage mode="edit" periodId={periodId} />;
}
