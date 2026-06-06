import { redirect } from "next/navigation";
import { getServerCurrentUser } from "@/features/auth/lib/server";
import { getRoleBoundary } from "@/features/auth/lib/roles";
import { AdminLayoutClient } from "@/features/admin/components/admin-layout-client";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getServerCurrentUser();
  const boundary = getRoleBoundary(user?.role_id, user?.role_name);

  if (!user) {
    redirect("/login?redirect=/admin");
  }

  if (boundary !== "admin") {
    redirect(boundary === "student" ? "/student" : "/login");
  }

  return (
    <AdminLayoutClient fullName={user.fullname} email={user.email} roleName={user.role_name}>
      {children}
    </AdminLayoutClient>
  );
}
