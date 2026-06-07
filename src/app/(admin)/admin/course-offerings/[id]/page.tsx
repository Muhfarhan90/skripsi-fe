"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getAdminCourseOfferingById } from "@/features/admin/api/master-api";

export default function AdminCourseOfferingDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const offeringId = Number(id);
  const offeringQuery = useQuery({
    queryKey: ["admin", "course-offerings", offeringId, "redirect"],
    queryFn: () => getAdminCourseOfferingById(offeringId),
    enabled: Number.isInteger(offeringId) && offeringId > 0,
    retry: 0,
  });

  useEffect(() => {
    if (!Number.isInteger(offeringId) || offeringId <= 0) {
      router.replace("/admin/academic-periods");
      return;
    }

    if (!offeringQuery.isSuccess) {
      return;
    }

    const periodId = offeringQuery.data?.academic_period_id;
    if (periodId && Number.isInteger(periodId) && periodId > 0) {
      router.replace(`/admin/academic-periods/${periodId}/offerings/${offeringId}`);
      return;
    }

    router.replace("/admin/academic-periods");
  }, [offeringId, offeringQuery.data, offeringQuery.isSuccess, router]);

  useEffect(() => {
    if (offeringQuery.isError) {
      router.replace("/admin/academic-periods");
    }
  }, [offeringQuery.isError, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <p className="text-sm text-zinc-600">Mengalihkan halaman...</p>
    </div>
  );
}
