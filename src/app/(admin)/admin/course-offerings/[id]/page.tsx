import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { buildApiUrl } from "@/features/auth/lib/server";
import { AUTH_COOKIE_NAME } from "@/features/auth/lib/constants";

interface AdminCourseOfferingDetailPageProps {
  params: Promise<{ id: string }>;
}

interface CourseOfferingLookupPayload {
  success?: boolean;
  data?: {
    id: number;
    academic_period_id: number | null;
  } | null;
}

async function resolveOfferingPeriodId(offeringId: number): Promise<number | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const response = await fetch(buildApiUrl(`/api/admin/course-offerings/${offeringId}`), {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json().catch(() => null)) as CourseOfferingLookupPayload | null;
  return payload?.success ? payload.data?.academic_period_id ?? null : null;
}

export default async function AdminCourseOfferingDetailPage({ params }: AdminCourseOfferingDetailPageProps) {
  const { id } = await params;
  const offeringId = Number(id);

  if (!Number.isInteger(offeringId) || offeringId <= 0) {
    notFound();
  }

  const periodId = await resolveOfferingPeriodId(offeringId);

  if (periodId && Number.isInteger(periodId) && periodId > 0) {
    redirect(`/admin/academic-periods/${periodId}/offerings/${offeringId}`);
  }

  redirect("/admin/academic-periods");
}
