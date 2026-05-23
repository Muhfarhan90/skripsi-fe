"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { AuthShell } from "@/components/shared/auth-shell";
import { FieldError } from "@/components/shared/field-error";
import { forgotPassword } from "@/features/auth/api/auth-api";
import { ApiError } from "@/lib/api/client";
import { forgotPasswordSchema, type ForgotPasswordSchema } from "@/lib/schemas/auth";
import { AuthInput } from "@/features/auth/components/auth-input";
import { SubmitButton } from "@/features/auth/components/submit-button";
import { applyApiFieldErrors } from "@/features/auth/utils/apply-api-field-errors";

export default function ForgotPasswordPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<ForgotPasswordSchema>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const forgotMutation = useMutation({
    mutationFn: forgotPassword,
    onSuccess: (message) => {
      toast.success(message || "Email reset password berhasil dikirim");
    },
    onError: (error) => {
      applyApiFieldErrors<ForgotPasswordSchema>(error, setError);

      if (error instanceof ApiError) {
        toast.error(error.message);
        return;
      }

      toast.error("Gagal memproses permintaan reset password");
    },
  });

  return (
    <AuthShell
      title="Lupa Password"
      subtitle="Masukkan email akun untuk menerima link reset password."
      footerText="Ingat password?"
      footerLinkText="Masuk"
      footerHref="/login"
    >
      <form className="space-y-4" onSubmit={handleSubmit((values) => forgotMutation.mutate(values))}>
        <div>
          <AuthInput label="Email" type="email" placeholder="name@email.com" {...register("email")} />
          <FieldError message={errors.email?.message} />
        </div>

        <SubmitButton loading={forgotMutation.isPending}>Kirim Link Reset</SubmitButton>
      </form>
    </AuthShell>
  );
}
