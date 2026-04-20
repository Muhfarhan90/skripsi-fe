"use client";

import Link from "next/link";
import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AuthShell } from "@/components/shared/auth-shell";
import { FieldError } from "@/components/shared/field-error";
import { login } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { loginSchema, type LoginSchema } from "@/lib/schemas/auth";
import { useAuthStore } from "@/stores/auth-store";
import { AuthInput } from "@/features/auth/components/auth-input";
import { SubmitButton } from "@/features/auth/components/submit-button";
import { applyApiFieldErrors } from "@/features/auth/utils/apply-api-field-errors";

export function LoginClient() {
  const router = useRouter();
  const setToken = useAuthStore((state) => state.setToken);
  const setUser = useAuthStore((state) => state.setUser);
  const hydrated = useAuthStore((state) => state.hydrated);
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

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
    if (!hydrated || !token || !user) return;
    // Redirect only when the session is fully restored (token + user).
    router.replace("/");
  }, [hydrated, router, token, user]);

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      setToken(data.token);
      setUser(data.user);
      toast.success("Login berhasil");
      router.replace("/");
    },
    onError: (error) => {
      applyApiFieldErrors<LoginSchema>(error, setError);

      if (error instanceof ApiError) {
        toast.error(error.message);
        return;
      }

      toast.error("Terjadi kesalahan saat login");
    },
  });

  return (
    <AuthShell
      title="Masuk"
      subtitle="Masuk menggunakan akun LMS Anda"
      footerText="Belum punya akun?"
      footerLinkText="Daftar"
      footerHref="/register"
    >
      <form className="space-y-4" onSubmit={handleSubmit((values) => loginMutation.mutate(values))}>
        <div>
          <AuthInput label="Email" type="email" placeholder="nama@email.com" {...registerField("email")} />
          <FieldError message={errors.email?.message} />
        </div>

        <div>
          <AuthInput label="Password" type="password" placeholder="********" {...registerField("password")} />
          <FieldError message={errors.password?.message} />
        </div>

        <SubmitButton loading={loginMutation.isPending}>Masuk</SubmitButton>
      </form>

      <div className="mt-4 flex flex-wrap gap-4 text-xs">
        <Link href="/forgot-password" className="text-zinc-600 hover:text-zinc-900 hover:underline">
          Lupa password?
        </Link>
        <Link href="/resend-verification" className="text-zinc-600 hover:text-zinc-900 hover:underline">
          Kirim ulang verifikasi
        </Link>
      </div>
    </AuthShell>
  );
}
