import { redirect } from "next/navigation";

interface AdminCourseOfferingCreatePageProps {
  searchParams: Promise<{
    academic_period_id?: string;
  }>;
}

export default async function AdminCourseOfferingCreatePage({ searchParams }: AdminCourseOfferingCreatePageProps) {
  const { academic_period_id: academicPeriodIdParam } = await searchParams;
  const academicPeriodId = Number(academicPeriodIdParam);

  if (Number.isInteger(academicPeriodId) && academicPeriodId > 0) {
    redirect(`/admin/academic-periods/${academicPeriodId}/offerings/new`);
  }

  redirect("/admin/academic-periods");
}
