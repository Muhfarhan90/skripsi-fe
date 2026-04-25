"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStatus } from "@/features/auth/hooks/use-auth-status";
import { getDefaultPathByRole, getRoleBoundary } from "@/features/auth/lib/roles";

interface RoleGuardProps {
  allowed: Array<"student" | "admin">;
  children: React.ReactNode;
}

export function RoleGuard({ allowed, children }: RoleGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { sessionChecked, isAuthenticated, roleId } = useAuthStatus();

  useEffect(() => {
    if (!sessionChecked) return;

    if (!isAuthenticated) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    const boundary = getRoleBoundary(roleId);

    // Keep route gating simple at top-level boundary: student vs admin.
    if (!boundary || !allowed.includes(boundary)) {
      router.replace(getDefaultPathByRole(roleId));
    }
  }, [allowed, sessionChecked, isAuthenticated, pathname, roleId, router]);

  if (!sessionChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <p className="text-sm text-zinc-600">Menyiapkan sesi...</p>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const boundary = getRoleBoundary(roleId);
  if (!boundary || !allowed.includes(boundary)) return null;

  return <>{children}</>;
}
