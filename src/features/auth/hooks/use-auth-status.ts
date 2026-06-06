"use client";

import { useMemo } from "react";
import { useAuthStore } from "@/features/auth/store/auth-store";

export function useAuthStatus() {
  const user = useAuthStore((state) => state.user);
  const sessionChecked = useAuthStore((state) => state.sessionChecked);

  return useMemo(
    () => ({
      sessionChecked,
      isAuthenticated: Boolean(user),
      roleId: user?.role_id ?? null,
      roleName: user?.role_name ?? null,
      user,
    }),
    [sessionChecked, user],
  );
}
