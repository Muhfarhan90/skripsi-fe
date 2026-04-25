"use client";

import { useLogoutAction } from "@/features/auth/hooks/use-logout-action";
import { useAuthStore } from "@/features/auth/store/auth-store";

export default function StudentPage() {
  const user = useAuthStore((state) => state.user);
  const logoutMutation = useLogoutAction();

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
