import { Suspense } from "react";
import { ResetPasswordClient } from "@/app/(public)/reset-password/reset-password-client";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-zinc-600">Memuat halaman reset password...</p>}>
      <ResetPasswordClient />
    </Suspense>
  );
}
