"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { useAuthStore } from "@/stores/auth-store";

export function AuthBootstrap() {
  const token = useAuthStore((state) => state.token);
  const hydrated = useAuthStore((state) => state.hydrated);
  const setUser = useAuthStore((state) => state.setUser);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const currentUserQuery = useQuery({
    queryKey: ["auth", "me", token],
    queryFn: async () => {
      if (!token) return null;
      return getCurrentUser(token);
    },
    enabled: hydrated && Boolean(token),
    staleTime: 60_000,
  });

  useEffect(() => {
    if (currentUserQuery.data) {
      setUser(currentUserQuery.data);
    }
  }, [currentUserQuery.data, setUser]);

  useEffect(() => {
    // Clear auth state only when token is actually unauthorized.
    const error = currentUserQuery.error;
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      clearAuth();
    }
  }, [clearAuth, currentUserQuery.error]);

  return null;
}
