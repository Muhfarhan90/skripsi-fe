"use client";

import { RoleGuard } from "@/components/shared/role-guard";
import { StudentLayoutClient } from "@/features/student/components/student-layout-client";
import { useAuthStore } from "@/features/auth/store/auth-store";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = useAuthStore((state) => state.user);

  return (
    <RoleGuard allowed={["student"]}>
      <StudentLayoutClient fullName={user?.fullname ?? ""}>{children}</StudentLayoutClient>
    </RoleGuard>
  );
}
