import { Suspense } from "react";
import { VerifyEmailClient } from "@/app/(public)/verify-email/verify-email-client";

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-600">Memuat halaman verifikasi...</p>}>
      <VerifyEmailClient />
    </Suspense>
  );
}
