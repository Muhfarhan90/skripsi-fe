import { notFound } from "next/navigation";
import { CourseOfferingFormPage } from "@/features/admin/components/course-offering-form-page";

interface AdminAcademicPeriodOfferingCreatePageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminAcademicPeriodOfferingCreatePage({
  params,
}: AdminAcademicPeriodOfferingCreatePageProps) {
  const { id } = await params;
  const periodId = Number(id);

  if (!Number.isInteger(periodId) || periodId <= 0) {
    notFound();
  }

  return <CourseOfferingFormPage mode="create" lockedAcademicPeriodId={periodId} />;
}
