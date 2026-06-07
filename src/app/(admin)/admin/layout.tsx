"use client";

import { RoleGuard } from "@/components/shared/role-guard";
import { AdminLayoutClient } from "@/features/admin/components/admin-layout-client";
import { useAuthStore } from "@/features/auth/store/auth-store";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = useAuthStore((state) => state.user);

  return (
    <RoleGuard allowed={["admin"]}>
      <AdminLayoutClient
        fullName={user?.fullname ?? ""}
        email={user?.email ?? ""}
        roleName={user?.role_name ?? null}
      >
        {children}
      </AdminLayoutClient>
    </RoleGuard>
  );
}
