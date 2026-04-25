"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { AuthShell } from "@/components/shared/auth-shell";
import { FieldError } from "@/components/shared/field-error";
import { resetPassword } from "@/features/auth/api/auth-api";
import { ApiError } from "@/lib/api/client";
import { resetPasswordSchema, type ResetPasswordSchema } from "@/lib/schemas/auth";
import { AuthInput } from "@/features/auth/components/auth-input";
import { SubmitButton } from "@/features/auth/components/submit-button";
import { applyApiFieldErrors } from "@/features/auth/utils/apply-api-field-errors";
import type { ResetPasswordRequest } from "@/types/auth";

export function ResetPasswordClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tokenFromQuery = searchParams.get("token") ?? "";
  const emailFromQuery = searchParams.get("email") ?? "";
  const isResetLinkInvalid = !tokenFromQuery || !emailFromQuery;

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<ResetPasswordSchema>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      password_confirmation: "",
    },
  });

  const resetMutation = useMutation({
    mutationFn: resetPassword,
    onSuccess: (message) => {
      toast.success(message || "Password berhasil direset");
      router.replace("/login");
    },
    onError: (error) => {
      applyApiFieldErrors<ResetPasswordSchema>(error, setError);

      if (error instanceof ApiError) {
        toast.error(error.message);
        return;
      }

      toast.error("Gagal reset password");
    },
  });

  return (
    <AuthShell
      title="Reset Password"
      subtitle="Masukkan password baru Anda"
      footerText="Kembali ke"
      footerLinkText="Login"
      footerHref="/login"
    >
      <form
        className="space-y-4"
        onSubmit={handleSubmit((values) => {
          // Email and token are trusted from reset-link query params, so user only inputs new password.
          if (isResetLinkInvalid) {
            toast.error("Link reset tidak valid atau sudah tidak lengkap");
            return;
          }

          const payload: ResetPasswordRequest = {
            email: emailFromQuery,
            token: tokenFromQuery,
            password: values.password,
            password_confirmation: values.password_confirmation,
          };

          resetMutation.mutate(payload);
        })}
      >
        {isResetLinkInvalid ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            Link reset password tidak valid. Silakan minta link reset baru.
          </p>
        ) : null}

        <div>
          <AuthInput label="Password Baru" type="password" placeholder="********" {...register("password")} />
          <FieldError message={errors.password?.message} />
        </div>

        <div>
          <AuthInput
            label="Konfirmasi Password"
            type="password"
            placeholder="********"
            {...register("password_confirmation")}
          />
          <FieldError message={errors.password_confirmation?.message} />
        </div>

        <SubmitButton loading={resetMutation.isPending} disabled={isResetLinkInvalid}>
          Reset Password
        </SubmitButton>
      </form>
    </AuthShell>
  );
}
