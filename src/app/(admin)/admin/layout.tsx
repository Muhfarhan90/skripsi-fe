import { redirect } from "next/navigation";
import { getServerCurrentUser } from "@/features/auth/lib/server";
import { getRoleBoundary } from "@/features/auth/lib/roles";
import { AdminShell } from "@/features/admin/components/admin-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getServerCurrentUser();
  const boundary = getRoleBoundary(user?.role_id);

  if (!user) {
    redirect("/login?redirect=/admin");
  }

  if (boundary !== "admin") {
    redirect(boundary === "student" ? "/student" : "/login");
  }

  return <AdminShell fullName={user.fullname} email={user.email}>{children}</AdminShell>;
}
