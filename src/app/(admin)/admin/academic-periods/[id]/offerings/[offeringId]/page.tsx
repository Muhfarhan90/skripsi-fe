import { notFound } from "next/navigation";
import { CourseOfferingFormPage } from "@/features/admin/components/course-offering-form-page";

interface AdminAcademicPeriodOfferingDetailPageProps {
  params: Promise<{ id: string; offeringId: string }>;
}

export default async function AdminAcademicPeriodOfferingDetailPage({
  params,
}: AdminAcademicPeriodOfferingDetailPageProps) {
  const { id, offeringId } = await params;
  const periodId = Number(id);
  const normalizedOfferingId = Number(offeringId);

  if (
    !Number.isInteger(periodId) ||
    periodId <= 0 ||
    !Number.isInteger(normalizedOfferingId) ||
    normalizedOfferingId <= 0
  ) {
    notFound();
  }

  return (
    <CourseOfferingFormPage
      key={`period-${periodId}-offering-${normalizedOfferingId}`}
      mode="edit"
      offeringId={normalizedOfferingId}
      lockedAcademicPeriodId={periodId}
    />
  );
}
