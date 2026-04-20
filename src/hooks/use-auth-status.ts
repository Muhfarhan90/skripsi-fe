"use client";

import { useMemo } from "react";
import { useAuthStore } from "@/stores/auth-store";

export function useAuthStatus() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);

  return useMemo(
    () => ({
      hydrated,
      isAuthenticated: Boolean(token),
      roleId: user?.role_id ?? null,
      user,
    }),
    [hydrated, token, user],
  );
}
