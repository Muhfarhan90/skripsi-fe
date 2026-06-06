import { redirect } from "next/navigation";
import { getServerCurrentUser } from "@/features/auth/lib/server";
import { getRoleBoundary } from "@/features/auth/lib/roles";
import { StudentLayoutClient } from "@/features/student/components/student-layout-client";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getServerCurrentUser();
  const boundary = getRoleBoundary(user?.role_id, user?.role_name);

  if (!user) {
    redirect("/login?redirect=/student");
  }

  if (boundary !== "student") {
    redirect(boundary === "admin" ? "/admin" : "/login");
  }

  return <StudentLayoutClient fullName={user.fullname}>{children}</StudentLayoutClient>;
}
