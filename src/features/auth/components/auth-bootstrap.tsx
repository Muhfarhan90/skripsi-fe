"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "@/features/auth/api/auth-api";
import { ApiError } from "@/lib/api/client";
import { useAuthStore } from "@/features/auth/store/auth-store";

export function AuthBootstrap() {
  const sessionChecked = useAuthStore((state) => state.sessionChecked);
  const setUser = useAuthStore((state) => state.setUser);
  const setSessionChecked = useAuthStore((state) => state.setSessionChecked);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const currentUserQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: getCurrentUser,
    enabled: !sessionChecked,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 4000),
    staleTime: 60_000,
  });
  const isUnauthorized =
    currentUserQuery.error instanceof ApiError &&
    (currentUserQuery.error.status === 401 || currentUserQuery.error.status === 403);

  useEffect(() => {
    if (currentUserQuery.data) {
      setUser(currentUserQuery.data);
    }
  }, [currentUserQuery.data, setUser]);

  useEffect(() => {
    // Clear auth state only when token is actually unauthorized.
    if (isUnauthorized) {
      clearAuth();
    }
  }, [clearAuth, isUnauthorized]);

  useEffect(() => {
    if (sessionChecked) return;
    if (!currentUserQuery.isSuccess && !isUnauthorized) return;
    setSessionChecked(true);
  }, [currentUserQuery.isSuccess, isUnauthorized, sessionChecked, setSessionChecked]);

  return null;
}
