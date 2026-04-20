import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
});

export const registerSchema = z
  .object({
    fullname: z.string().min(3, "Nama minimal 3 karakter").max(255),
    email: z.email("Email tidak valid"),
    password: z.string().min(8, "Password minimal 8 karakter"),
    password_confirmation: z
      .string()
      .min(8, "Konfirmasi password minimal 8 karakter"),
    nisn: z.string().max(20).optional().or(z.literal("")),
    phone: z.string().max(20).optional().or(z.literal("")),
    address: z.string().optional().or(z.literal("")),
    school_origin: z.string().max(255).optional().or(z.literal("")),
    gender: z.enum(["laki", "perempuan"]).optional(),
    bio: z.string().max(500).optional().or(z.literal("")),
    date_of_birth: z.string().optional().or(z.literal("")),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: "Konfirmasi password tidak sama",
    path: ["password_confirmation"],
  });

export const resendVerificationSchema = z.object({
  email: z.email("Email tidak valid"),
});

export const forgotPasswordSchema = z.object({
  email: z.email("Email tidak valid"),
});

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password minimal 8 karakter"),
    password_confirmation: z
      .string()
      .min(8, "Konfirmasi password minimal 8 karakter"),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: "Konfirmasi password tidak sama",
    path: ["password_confirmation"],
  });

export type LoginSchema = z.infer<typeof loginSchema>;
export type RegisterSchema = z.infer<typeof registerSchema>;
export type ResendVerificationSchema = z.infer<typeof resendVerificationSchema>;
export type ForgotPasswordSchema = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordSchema = z.infer<typeof resetPasswordSchema>;
