"use client";

import { ExactAdminGuard } from "@/components/shared/exact-admin-guard";
import { AdminSalesReportsPage } from "@/features/admin/components/admin-sales-reports-page";

export default function AdminReportsPage() {
  return (
    <ExactAdminGuard>
      <AdminSalesReportsPage />
    </ExactAdminGuard>
  );
}
