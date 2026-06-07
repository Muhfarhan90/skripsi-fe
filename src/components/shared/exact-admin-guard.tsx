"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStatus } from "@/features/auth/hooks/use-auth-status";
import { isExactAdminRole } from "@/features/auth/lib/roles";

interface ExactAdminGuardProps {
  children: React.ReactNode;
}

export function ExactAdminGuard({ children }: ExactAdminGuardProps) {
  const router = useRouter();
  const { sessionChecked, isAuthenticated, roleId, roleName } = useAuthStatus();

  useEffect(() => {
    if (!sessionChecked) {
      return;
    }

    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    if (!isExactAdminRole(roleName, roleId)) {
      router.replace("/admin");
    }
  }, [isAuthenticated, roleId, roleName, router, sessionChecked]);

  if (!sessionChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <p className="text-sm text-zinc-600">Menyiapkan sesi...</p>
      </div>
    );
  }

  if (!isAuthenticated || !isExactAdminRole(roleName, roleId)) {
    return null;
  }

  return <>{children}</>;
}
