import { Suspense } from "react";
import { ResetPasswordClient } from "@/app/(public)/reset-password/reset-password-client";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-600">Loading reset password page...</p>}>
      <ResetPasswordClient />
    </Suspense>
  );
}
