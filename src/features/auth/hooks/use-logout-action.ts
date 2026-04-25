"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { logout } from "@/features/auth/api/auth-api";
import { useAuthStore } from "@/features/auth/store/auth-store";

interface UseLogoutActionOptions {
  redirectTo?: string;
}

export function useLogoutAction(options?: UseLogoutActionOptions) {
  const router = useRouter();
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const redirectTo = options?.redirectTo ?? "/login";

  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      clearAuth();
      toast.success("Logout berhasil");
      router.replace(redirectTo);
    },
    onError: () => {
      clearAuth();
      router.replace(redirectTo);
    },
  });
}
