"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  deactivateCurrentDevice,
  logout,
} from "@/features/auth/api/auth-api";
import { clearStoredAuthToken } from "@/features/auth/lib/token-storage";
import { getStoredBrowserDeviceId } from "@/features/auth/lib/device";
import { useAuthStore } from "@/features/auth/store/auth-store";
import { revokeFirebaseMessagingToken } from "@/lib/firebase";

interface UseLogoutActionOptions {
  redirectTo?: string;
}

export function useLogoutAction(options?: UseLogoutActionOptions) {
  const router = useRouter();
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const redirectTo = options?.redirectTo ?? "/";

  return useMutation({
    mutationFn: async () => {
      const deviceId = getStoredBrowserDeviceId();

      await Promise.allSettled([
        deviceId ? deactivateCurrentDevice(deviceId) : Promise.resolve(""),
        revokeFirebaseMessagingToken(),
      ]);

      return logout();
    },
    onSuccess: () => {
      clearStoredAuthToken();
      clearAuth();
      toast.success("Logout berhasil");
      router.replace(redirectTo);
    },
    onError: () => {
      clearStoredAuthToken();
      clearAuth();
      router.replace(redirectTo);
    },
  });
}
