"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { AuthShell } from "@/components/shared/auth-shell";
import { FieldError } from "@/components/shared/field-error";
import { ApiError } from "@/lib/api/client";
import { loginSchema, type LoginSchema } from "@/lib/schemas/auth";
import { login } from "@/features/auth/api/auth-api";
import { useAuthStore } from "@/features/auth/store/auth-store";
import {
  getDefaultPathByRole,
  getSafeInternalRedirectPath,
} from "@/features/auth/lib/roles";
import { AuthInput } from "@/features/auth/components/auth-input";
import { SubmitButton } from "@/features/auth/components/submit-button";
import { applyApiFieldErrors } from "@/features/auth/utils/apply-api-field-errors";

export function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setUser = useAuthStore((state) => state.setUser);
  const sessionChecked = useAuthStore((state) => state.sessionChecked);
  const setSessionChecked = useAuthStore((state) => state.setSessionChecked);
  const user = useAuthStore((state) => state.user);
  const redirectTarget = useMemo(
    () => getSafeInternalRedirectPath(searchParams.get("redirect")),
    [searchParams],
  );

  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    if (!sessionChecked || !user) return;
    // Redirect only when session check completed and user is authenticated.
    router.replace(redirectTarget ?? getDefaultPathByRole(user.role_id, user.role_name));
  }, [redirectTarget, router, sessionChecked, user]);

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      setUser(data.user);
      setSessionChecked(true);
      toast.success("Berhasil masuk");
      router.replace(redirectTarget ?? getDefaultPathByRole(data.user.role_id, data.user.role_name));
    },
    onError: (error) => {
      applyApiFieldErrors<LoginSchema>(error, setError);

      if (error instanceof ApiError) {
        toast.error(error.message);
        return;
      }

      toast.error("Gagal masuk ke akun");
    },
  });

  return (
    <AuthShell
      title="Masuk ke Akun"
      subtitle="Gunakan akun Anda untuk melanjutkan belajar, mengakses course, dan memantau progress."
      footerText="Belum punya akun?"
      footerLinkText="Daftar Sekarang"
      footerHref="/register"
    >
      <form className="space-y-4" onSubmit={handleSubmit((values) => loginMutation.mutate(values))}>
        <div>
          <AuthInput label="Email" type="email" placeholder="name@email.com" {...registerField("email")} />
          <FieldError message={errors.email?.message} />
        </div>

        <div>
          <AuthInput label="Password" type="password" placeholder="Masukkan password" {...registerField("password")} />
          <FieldError message={errors.password?.message} />
        </div>

        <SubmitButton loading={loginMutation.isPending}>Masuk</SubmitButton>
      </form>

      <div className="mt-4 flex flex-wrap gap-4 text-xs">
        <Link href="/forgot-password" className="text-zinc-600 hover:text-zinc-900 hover:underline">
          Lupa password?
        </Link>
        <Link href="/resend-verification" className="text-zinc-600 hover:text-zinc-900 hover:underline">
          Kirim ulang verifikasi email
        </Link>
      </div>
    </AuthShell>
  );
}
