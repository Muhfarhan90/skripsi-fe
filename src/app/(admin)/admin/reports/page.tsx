import { redirect } from "next/navigation";
import { getServerCurrentUser } from "@/features/auth/lib/server";
import { isExactAdminRole } from "@/features/auth/lib/roles";
import { AdminSalesReportsPage } from "@/features/admin/components/admin-sales-reports-page";

export default async function AdminReportsPage() {
  const user = await getServerCurrentUser();

  if (!user) {
    redirect("/login?redirect=/admin/reports");
  }

  if (!isExactAdminRole(user.role_name, user.role_id)) {
    redirect("/admin");
  }

  return <AdminSalesReportsPage />;
}
