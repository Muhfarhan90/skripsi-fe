import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerCurrentUser } from "@/features/auth/lib/server";
import { getRoleBoundary } from "@/features/auth/lib/roles";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getServerCurrentUser();
  const boundary = getRoleBoundary(user?.role_id);

  if (!user) {
    redirect("/login?redirect=/student");
  }

  if (boundary !== "student") {
    redirect(boundary === "admin" ? "/admin" : "/login");
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <p className="text-sm font-semibold text-[#0F7A5A]">Student Area</p>
          <Link href="/login" className="text-sm text-zinc-600 hover:text-zinc-900">
            Kembali ke login
          </Link>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-8">{children}</div>
    </div>
  );
}
