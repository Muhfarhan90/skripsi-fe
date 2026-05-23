"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { AuthShell } from "@/components/shared/auth-shell";
import { FieldError } from "@/components/shared/field-error";
import { ApiError } from "@/lib/api/client";
import { resendVerificationEmail } from "@/features/auth/api/auth-api";
import {
  resendVerificationSchema,
  type ResendVerificationSchema,
} from "@/lib/schemas/auth";
import { AuthInput } from "@/features/auth/components/auth-input";
import { SubmitButton } from "@/features/auth/components/submit-button";
import { applyApiFieldErrors } from "@/features/auth/utils/apply-api-field-errors";

export default function ResendVerificationPage() {
  const [cooldownLeft, setCooldownLeft] = useState(0);

  useEffect(() => {
    if (cooldownLeft <= 0) {
      return;
    }

    // Decrease resend cooldown every second until user can request again.
    const timer = window.setInterval(() => {
      setCooldownLeft((previous) => (previous > 0 ? previous - 1 : 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [cooldownLeft]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<ResendVerificationSchema>({
    resolver: zodResolver(resendVerificationSchema),
    defaultValues: { email: "" },
  });

  const resendMutation = useMutation({
    mutationFn: resendVerificationEmail,
    onSuccess: (data) => {
      if (typeof data?.retry_after === "number") {
        setCooldownLeft(data.retry_after);
        toast.success(`Email verifikasi dikirim. Coba lagi dalam ${data.retry_after} detik jika diperlukan.`);
        return;
      }

      toast.success("Email verifikasi berhasil dikirim");
    },
    onError: (error) => {
      applyApiFieldErrors<ResendVerificationSchema>(error, setError);

      if (error instanceof ApiError) {
        const retryAfterRaw = error.errors?.retry_after?.[0];
        const retryAfter = typeof retryAfterRaw === "number"
          ? retryAfterRaw
          : Number.parseInt(String(retryAfterRaw ?? ""), 10);

        if (Number.isFinite(retryAfter) && retryAfter > 0) {
          setCooldownLeft(retryAfter);
        }

        toast.error(error.message);
        return;
      }

      toast.error("Gagal mengirim ulang email verifikasi");
    },
  });

  return (
    <AuthShell
      title="Kirim Ulang Verifikasi"
      subtitle="Gunakan halaman ini jika email verifikasi akun belum diterima."
      footerText="Kembali ke halaman"
      footerLinkText="Masuk"
      footerHref="/login"
    >
      <form className="space-y-4" onSubmit={handleSubmit((values) => resendMutation.mutate(values))}>
        <div>
          <AuthInput label="Email" type="email" placeholder="name@email.com" {...register("email")} />
          <FieldError message={errors.email?.message} />
        </div>

        {cooldownLeft > 0 ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
            Email verifikasi dapat dikirim ulang dalam {cooldownLeft} detik.
          </p>
        ) : null}

        <SubmitButton loading={resendMutation.isPending} disabled={cooldownLeft > 0}>
          {cooldownLeft > 0 ? `Tunggu ${cooldownLeft}s` : "Kirim Ulang Email"}
        </SubmitButton>
      </form>
    </AuthShell>
  );
}
