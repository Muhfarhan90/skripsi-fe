"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { logout } from "@/lib/api/auth";
import { useAuthStore } from "@/stores/auth-store";

export default function StudentPage() {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const logoutMutation = useMutation({
    mutationFn: async () => {
      if (!token) return;
      await logout(token);
    },
    onSuccess: () => {
      clearAuth();
      toast.success("Logout berhasil");
      router.replace("/login");
    },
    onError: () => {
      clearAuth();
      router.replace("/login");
    },
  });

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold text-zinc-900">Dashboard Student</h1>
      <p className="text-zinc-600">Selamat datang, {user?.fullname ?? "Student"}.</p>
      <button
        type="button"
        onClick={() => logoutMutation.mutate()}
        className="inline-flex rounded-lg bg-[#D9AF00] px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-[#c9a200]"
      >
        Logout
      </button>
    </section>
  );
}
