import { Suspense } from "react";
import { LoginClient } from "@/app/(public)/login/login-client";

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-600">Memuat halaman login...</p>}>
      <LoginClient />
    </Suspense>
  );
}
