"use client";

import Link from "next/link";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAuthStore } from "@/features/auth/store/auth-store";
import { getDefaultPathByRole } from "@/features/auth/lib/roles";
import { useLogoutAction } from "@/features/auth/hooks/use-logout-action";

export default function RootPage() {
  const user = useAuthStore((state) => state.user);
  const logoutMutation = useLogoutAction();

  const isLoggedIn = Boolean(user);
  const dashboardHref = getDefaultPathByRole(user?.role_id);

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#f3faf7] via-white to-[#fff8dd]">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-end px-6 pt-6">
        {isLoggedIn ? (
          <Popover>
            <PopoverTrigger>
              <button
                type="button"
                className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white/90 px-3 py-2 shadow-sm backdrop-blur transition hover:bg-white"
              >
                <div className="size-8 rounded-full bg-[#0F7A5A]/10 text-center text-xs leading-8 font-semibold text-[#0F7A5A]">
                  {user?.fullname?.trim().charAt(0).toUpperCase() || "U"}
                </div>
                <p className="max-w-40 truncate text-sm font-medium text-zinc-800" title={user?.fullname ?? "User"}>
                  {user?.fullname ?? "User"}
                </p>
              </button>
            </PopoverTrigger>

            <PopoverContent align="end" sideOffset={8} className="w-56 p-2">
              <p className="px-2 py-1 text-xs text-zinc-500">Masuk sebagai</p>
              <p className="px-2 pb-2 text-sm font-medium text-zinc-900">{user?.email ?? "-"}</p>

              <Link
                href={dashboardHref}
                className="inline-flex h-9 w-full items-center rounded-md px-2 text-sm text-zinc-800 transition hover:bg-zinc-100"
              >
                Dashboard
              </Link>
              <button
                type="button"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                className="inline-flex h-9 w-full items-center rounded-md px-2 text-sm text-red-600 transition hover:bg-red-50 disabled:opacity-70"
              >
                {logoutMutation.isPending ? "Memproses..." : "Logout"}
              </button>
            </PopoverContent>
          </Popover>
        ) : (
          <Link
            href="/login"
            className="inline-flex h-9 items-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50"
          >
            Masuk
          </Link>
        )}
      </div>

      <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center px-6 py-16 text-center">
        <p className="rounded-full border border-[#0F7A5A]/20 bg-[#0F7A5A]/10 px-4 py-1 text-xs font-medium text-[#0F7A5A]">
          Pre-University LMS
        </p>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-5xl">
          Selamat datang di platform belajar Anda
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-600 sm:text-base">
          Mulai perjalanan belajar Anda dari satu tempat: materi, kuis, diskusi, dan progress pembelajaran.
        </p>

        <div className="mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
          {isLoggedIn ? (
            <Link
              href={dashboardHref}
              className="inline-flex h-11 items-center justify-center rounded-md bg-[#0F7A5A] px-6 text-sm font-medium text-white transition hover:bg-[#0d6b4f]"
            >
              Lanjut ke Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="inline-flex h-11 items-center justify-center rounded-md bg-[#0F7A5A] px-6 text-sm font-medium text-white transition hover:bg-[#0d6b4f]"
              >
                Masuk
              </Link>
              <Link
                href="/register"
                className="inline-flex h-11 items-center justify-center rounded-md border border-zinc-300 bg-white px-6 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50"
              >
                Daftar
              </Link>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
