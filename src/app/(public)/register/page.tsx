"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { AuthShell } from "@/components/shared/auth-shell";
import { FieldError } from "@/components/shared/field-error";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { register as registerApi } from "@/features/auth/api/auth-api";
import { ApiError } from "@/lib/api/client";
import { registerSchema, type RegisterSchema } from "@/lib/schemas/auth";
import { AuthInput } from "@/features/auth/components/auth-input";
import { DatePicker } from "@/features/auth/components/date-picker";
import { SubmitButton } from "@/features/auth/components/submit-button";
import { applyApiFieldErrors } from "@/features/auth/utils/apply-api-field-errors";

export default function RegisterPage() {
  const router = useRouter();

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
    setError,
  } = useForm<RegisterSchema>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullname: "",
      email: "",
      password: "",
      password_confirmation: "",
      nisn: "",
      phone: "",
      address: "",
      school_origin: "",
      bio: "",
      date_of_birth: "",
    },
  });

  const registerMutation = useMutation({
    mutationFn: registerApi,
    onSuccess: (data) => {
      reset();
      const verifyHint = data.frontend_verification_url || data.verification_url;
      toast.success("Registrasi berhasil. Silakan verifikasi email Anda.");

      if (verifyHint) {
        toast.info("Tautan verifikasi tersedia untuk environment debug.");
      }

      router.replace("/login");
    },
    onError: (error) => {
      applyApiFieldErrors<RegisterSchema>(error, setError);

      if (error instanceof ApiError) {
        toast.error(error.message);
        return;
      }

      toast.error("Registrasi gagal");
    },
  });

  return (
    <AuthShell
      title="Daftar Akun"
      subtitle="Pendaftaran publik selalu dibuat sebagai Student"
      footerText="Sudah punya akun?"
      footerLinkText="Masuk"
      footerHref="/login"
      className="max-w-xl"
    >
      <form className="grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={handleSubmit((values) => registerMutation.mutate(values))}>
        <div className="sm:col-span-2">
          <AuthInput label="Nama Lengkap" placeholder="Nama lengkap" {...register("fullname")} />
          <FieldError message={errors.fullname?.message} />
        </div>

        <div className="sm:col-span-2">
          <AuthInput label="Email" type="email" placeholder="nama@email.com" {...register("email")} />
          <FieldError message={errors.email?.message} />
        </div>

        <div>
          <AuthInput label="Password" type="password" placeholder="********" {...register("password")} />
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

        <div>
          <AuthInput label="NISN (opsional)" placeholder="NISN" {...register("nisn")} />
          <FieldError message={errors.nisn?.message} />
        </div>

        <div>
          <AuthInput label="No. Telepon (opsional)" placeholder="08xxxx" {...register("phone")} />
          <FieldError message={errors.phone?.message} />
        </div>

        <div className="sm:col-span-2">
          <AuthInput label="Asal Sekolah (opsional)" placeholder="Nama sekolah" {...register("school_origin")} />
          <FieldError message={errors.school_origin?.message} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="gender">Gender (opsional)</Label>
          <Controller
            name="gender"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value ?? "unspecified"}
                onValueChange={(value) => field.onChange(value === "unspecified" ? undefined : value)}
              >
                <SelectTrigger id="gender" className="h-10 w-full border-input bg-background">
                  <SelectValue placeholder="Pilih gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unspecified">Tidak diisi</SelectItem>
                  <SelectItem value="laki">Laki-laki</SelectItem>
                  <SelectItem value="perempuan">Perempuan</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          <FieldError message={errors.gender?.message} />
        </div>

        <div>
          <Controller
            name="date_of_birth"
            control={control}
            render={({ field }) => (
              <DatePicker
                label="Tanggal Lahir (opsional)"
                value={field.value}
                onChange={field.onChange}
                placeholder="Pilih tanggal lahir"
              />
            )}
          />
          <FieldError message={errors.date_of_birth?.message} />
        </div>

        <div className="sm:col-span-2">
          <AuthInput label="Alamat (opsional)" placeholder="Alamat" {...register("address")} />
          <FieldError message={errors.address?.message} />
        </div>

        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="bio">Bio (opsional)</Label>
          <Textarea
            id="bio"
            rows={3}
            {...register("bio")}
            className="border-input bg-background focus-visible:border-primary focus-visible:ring-primary/25"
          />
          <FieldError message={errors.bio?.message} />
        </div>

        <div className="sm:col-span-2">
          <SubmitButton loading={registerMutation.isPending}>Daftar</SubmitButton>
        </div>
      </form>

      <p className="mt-4 text-xs text-zinc-500">
        Setelah daftar, cek email Anda untuk verifikasi akun. Jika belum ada email, gunakan menu{" "}
        <Link href="/resend-verification" className="text-primary hover:underline">
          kirim ulang verifikasi
        </Link>
        .
      </p>
    </AuthShell>
  );
}
