"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStatus } from "@/hooks/use-auth-status";

interface RoleGuardProps {
  allowed: Array<"student" | "admin">;
  children: React.ReactNode;
}

export function RoleGuard({ allowed, children }: RoleGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { hydrated, isAuthenticated, roleId } = useAuthStatus();

  useEffect(() => {
    if (!hydrated) return;

    if (!isAuthenticated) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    const boundary = roleId === 3 ? "student" : roleId === 1 || roleId === 2 ? "admin" : null;

    // Keep route gating simple at top-level boundary: student vs admin.
    if (!boundary || !allowed.includes(boundary)) {
      router.replace(boundary === "admin" ? "/admin" : "/student");
    }
  }, [allowed, hydrated, isAuthenticated, pathname, roleId, router]);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <p className="text-sm text-zinc-600">Menyiapkan sesi...</p>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const boundary = roleId === 3 ? "student" : roleId === 1 || roleId === 2 ? "admin" : null;
  if (!boundary || !allowed.includes(boundary)) return null;

  return <>{children}</>;
}
