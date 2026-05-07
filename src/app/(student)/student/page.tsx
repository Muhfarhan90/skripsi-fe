"use client";

import Link from "next/link";
import { useLogoutAction } from "@/features/auth/hooks/use-logout-action";
import { useAuthStore } from "@/features/auth/store/auth-store";

export default function StudentPage() {
  const user = useAuthStore((state) => state.user);
  const logoutMutation = useLogoutAction();

  return (
    <section className="space-y-5">
      <header className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <span className="inline-flex rounded-md border border-border bg-card px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          Student Panel
        </span>
        <h1 className="mt-3 text-2xl font-semibold text-foreground">Dashboard Student</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Selamat datang, {user?.fullname ?? "Student"}.
        </p>
      </header>

      <button
        type="button"
        onClick={() => logoutMutation.mutate()}
        disabled={logoutMutation.isPending}
        className="inline-flex h-9 items-center rounded-md bg-secondary px-4 text-sm font-medium text-secondary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {logoutMutation.isPending ? "Memproses logout..." : "Logout"}
      </button>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/courses"
          className="inline-flex h-9 items-center rounded-md border border-border bg-card px-4 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          Jelajahi Course
        </Link>
        <Link
          href="/student/cart"
          className="inline-flex h-9 items-center rounded-md border border-border bg-card px-4 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          Buka Cart
        </Link>
        <Link
          href="/student/orders"
          className="inline-flex h-9 items-center rounded-md border border-border bg-card px-4 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          Riwayat Order
        </Link>
        <Link
          href="/student/enrollments"
          className="inline-flex h-9 items-center rounded-md border border-border bg-card px-4 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          Enrollment Saya
        </Link>
      </div>
    </section>
  );
}
