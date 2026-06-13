"use client";

import { useEffect, useMemo, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/shared/auth-shell";
import {
  verifyEmailWithAbsoluteUrl,
  verifyEmailWithParams,
} from "@/features/auth/api/auth-api";
import { SubmitButton } from "@/features/auth/components/submit-button";

export function VerifyEmailClient() {
  const searchParams = useSearchParams();
  const hasTriggeredAutoVerify = useRef(false);

  const verifyParams = useMemo(
    () => ({
      status: searchParams.get("status"),
      message: searchParams.get("message"),
      verifyUrl: searchParams.get("verify_url"),
      id: searchParams.get("id"),
      hash: searchParams.get("hash"),
      expires: searchParams.get("expires"),
      signature: searchParams.get("signature"),
    }),
    [searchParams],
  );

  const verifyMutation = useMutation({
    mutationFn: async () => {
      // Support both backend variants: full verify_url and id/hash/signature params.
      if (verifyParams.verifyUrl) {
        return verifyEmailWithAbsoluteUrl(verifyParams.verifyUrl);
      }

      if (verifyParams.id && verifyParams.hash) {
        return verifyEmailWithParams({
          id: verifyParams.id,
          hash: verifyParams.hash,
          expires: verifyParams.expires,
          signature: verifyParams.signature,
        });
      }

      throw new Error("Parameter verifikasi tidak lengkap");
    },
  });

  const isRedirectedSuccess = verifyParams.status === "success";
  const isRedirectedError = verifyParams.status === "error";
  const hasValidParams = Boolean(verifyParams.verifyUrl || (verifyParams.id && verifyParams.hash));

  useEffect(() => {
    // Auto-verify once when user lands from email link with valid params.
    if (isRedirectedSuccess || isRedirectedError) {
      return;
    }

    if (!hasValidParams || hasTriggeredAutoVerify.current || verifyMutation.isPending || verifyMutation.isSuccess) {
      return;
    }

    hasTriggeredAutoVerify.current = true;
    verifyMutation.mutate();
  }, [hasValidParams, isRedirectedError, isRedirectedSuccess, verifyMutation]);

  const errorMessage =
    verifyMutation.error instanceof Error
      ? verifyMutation.error.message
      : "Verifikasi gagal. Silakan coba lagi.";

  return (
    <AuthShell
      title="Verifikasi Email"
      subtitle="Kami sedang memproses verifikasi email akun Anda."
      footerText="Butuh email baru?"
      footerLinkText="Kirim Ulang Verifikasi"
      footerHref="/resend-verification"
    >
      <div className="space-y-4">
        {isRedirectedSuccess ? (
          <>
            <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              {verifyParams.message || "Email berhasil diverifikasi"}
            </p>
            <Link
              href="/login"
              className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Lanjut Masuk
            </Link>
          </>
        ) : null}

        {isRedirectedError ? (
          <>
            <p className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
              {verifyParams.message || "Verifikasi gagal. Link tidak valid atau sudah kedaluwarsa."}
            </p>
            <Link
              href="/resend-verification"
              className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Kirim Ulang Verifikasi
            </Link>
            <Link
              href="/"
              className="inline-flex h-10 w-full items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-muted"
            >
              Kembali ke Beranda
            </Link>
          </>
        ) : null}

        {!isRedirectedSuccess && !isRedirectedError && !hasValidParams ? (
          <>
            <p className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
              Link verifikasi tidak valid atau parameter tidak lengkap.
            </p>
            <Link
              href="/"
              className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Kembali ke Beranda
            </Link>
          </>
        ) : null}

        {!isRedirectedSuccess && !isRedirectedError && hasValidParams && verifyMutation.isPending ? (
          <SubmitButton type="button" loading>
            Memverifikasi Email...
          </SubmitButton>
        ) : null}

        {!isRedirectedSuccess && !isRedirectedError && hasValidParams && verifyMutation.isSuccess ? (
          <>
            <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              {verifyMutation.data || "Email berhasil diverifikasi"}
            </p>
            <Link
              href="/login"
              className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Lanjut Masuk
            </Link>
          </>
        ) : null}

        {!isRedirectedSuccess && !isRedirectedError && hasValidParams && verifyMutation.isError ? (
          <>
            <p className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
              {errorMessage}
            </p>
            <SubmitButton
              type="button"
              loading={verifyMutation.isPending}
              onClick={() => verifyMutation.mutate()}
            >
              Coba Verifikasi Lagi
            </SubmitButton>
            <Link
              href="/"
              className="inline-flex h-10 w-full items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-muted"
            >
              Kembali ke Beranda
            </Link>
          </>
        ) : null}

        <p className="text-xs text-zinc-500">
          Jika link sudah kedaluwarsa, minta link baru dari halaman{" "}
          <Link href="/resend-verification" className="text-[#0F7A5A] hover:underline">
            kirim ulang verifikasi
          </Link>
          .
        </p>
      </div>
    </AuthShell>
  );
}
