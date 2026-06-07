"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { ClientRedirect } from "@/components/shared/client-redirect";

export default function AdminCourseOfferingCreatePage() {
  const searchParams = useSearchParams();
  const academicPeriodIdParam = searchParams.get("academic_period_id");
  const academicPeriodId = Number(academicPeriodIdParam);

  const targetHref = useMemo(() => {
    if (Number.isInteger(academicPeriodId) && academicPeriodId > 0) {
      return `/admin/academic-periods/${academicPeriodId}/offerings/new`;
    }

    return "/admin/academic-periods";
  }, [academicPeriodId]);

  return <ClientRedirect href={targetHref} />;
}
