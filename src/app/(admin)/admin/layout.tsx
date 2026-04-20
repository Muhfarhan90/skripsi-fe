import Link from "next/link";
import { RoleGuard } from "@/components/shared/role-guard";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard allowed={["admin"]}>
      <div className="min-h-screen bg-zinc-50">
        <header className="border-b border-zinc-200 bg-white">
          <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
            <p className="text-sm font-semibold text-[#0F7A5A]">Admin Area (includes instructor capabilities)</p>
            <Link href="/login" className="text-sm text-zinc-600 hover:text-zinc-900">
              Kembali ke login
            </Link>
          </div>
        </header>
        <div className="mx-auto max-w-5xl px-4 py-8">{children}</div>
      </div>
    </RoleGuard>
  );
}
