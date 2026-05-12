import { notFound } from "next/navigation";
import { CourseOfferingFormPage } from "@/features/admin/components/course-offering-form-page";
import { getCourseOfferingById } from "@/features/admin/data/offering-data";

interface AdminCourseOfferingDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminCourseOfferingDetailPage({ params }: AdminCourseOfferingDetailPageProps) {
  const { id } = await params;
  const offeringId = Number(id);

  if (!Number.isInteger(offeringId) || offeringId <= 0) {
    notFound();
  }

  if (!getCourseOfferingById(offeringId)) {
    notFound();
  }

  return <CourseOfferingFormPage mode="edit" offeringId={offeringId} />;
}
