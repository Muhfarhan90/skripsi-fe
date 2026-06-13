"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Award, ExternalLink, GraduationCap, Printer } from "lucide-react";
import { toast } from "sonner";
import { getStudentCertificates } from "@/features/student/api/store-api";
import { printCertificatePreview } from "@/features/student/lib/certificate-print";
import { formatUtcDateTimeToJakarta } from "@/features/student/lib/date-time";

export default function StudentCertificatesPage() {
  const [printingCertificateId, setPrintingCertificateId] = useState<number | null>(null);
  const certificatesQuery = useQuery({
    queryKey: ["student", "certificates"],
    queryFn: getStudentCertificates,
  });

  const handlePrintCertificate = async (certificateId: number) => {
    setPrintingCertificateId(certificateId);

    try {
      await printCertificatePreview(`/api/student/certificates/${certificateId}/preview`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sertifikat tidak bisa dibuka.");
    } finally {
      setPrintingCertificateId(null);
    }
  };

  if (certificatesQuery.isLoading) {
    return (
      <section className="space-y-4">
        <div className="h-20 animate-pulse rounded-2xl bg-[var(--border)]" />
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-[var(--border)]" />
          ))}
        </div>
      </section>
    );
  }

  if (certificatesQuery.isError) {
    return (
      <article className="rounded-xl border border-[var(--danger-soft-border)] bg-[var(--danger-soft-bg)] p-4 text-sm text-[var(--danger-soft-foreground)]">
        Sertifikat tidak bisa dimuat. Silakan coba lagi.
      </article>
    );
  }

  const certificates = certificatesQuery.data ?? [];

  return (
    <section className="space-y-4">
      {/* Header */}
      <header className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-4 shadow-sm">
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--secondary)]/15 text-[var(--secondary)]">
          <Award className="size-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold text-[var(--foreground)]">Sertifikat Saya</h1>
          <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
            Sertifikat kelas yang sudah selesai dan bisa dicetak.
          </p>
        </div>
        {certificates.length > 0 ? (
          <span className="ml-auto inline-flex size-7 items-center justify-center rounded-full bg-[var(--secondary)] text-xs font-bold text-[var(--secondary-foreground)]">
            {certificates.length}
          </span>
        ) : null}
      </header>

      {/* Empty state */}
      {certificates.length === 0 ? (
        <article className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)] p-8 text-center shadow-sm">
          <span className="inline-flex size-16 items-center justify-center rounded-2xl bg-[var(--surface-soft)]">
            <GraduationCap className="size-8 text-[var(--muted-foreground)]" />
          </span>
          <div>
            <p className="font-semibold text-[var(--foreground)]">Belum ada sertifikat</p>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Selesaikan progress kursus 100% dan semua assignment wajib untuk mendapatkan sertifikat.
            </p>
          </div>
          <Link
            href="/student/enrollments"
            className="inline-flex h-9 items-center rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white transition active:scale-95"
          >
            Lihat Kelas Saya
          </Link>
        </article>
      ) : null}

      {/* Certificates list */}
      {certificates.length > 0 ? (
        <div className="space-y-3">
          {certificates.map((certificate) => (
            <article
              key={certificate.id}
              className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm"
            >
              {/* Decorative header strip */}
              <div className="h-1.5 bg-[var(--primary)]" />

              <div className="p-4">
                {/* Top row */}
                <div className="flex items-start gap-3">
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--secondary)]/15 text-[var(--secondary)]">
                    <Award className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
                      Sertifikat Kelulusan
                    </p>
                    <h2 className="mt-0.5 line-clamp-2 text-sm font-bold leading-snug text-[var(--foreground)]">
                      {certificate.course?.title ?? `Course #${certificate.course_id}`}
                    </h2>
                  </div>
                </div>

                {/* Details */}
                <div className="mt-3 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--muted-foreground)]">No. Sertifikat</span>
                    <span className="font-semibold text-[var(--foreground)]">{certificate.certificate_number}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--muted-foreground)]">Diterbitkan</span>
                    <span className="font-semibold text-[var(--foreground)]">
                      {formatUtcDateTimeToJakarta(certificate.issued_at)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 grid grid-cols-2 gap-2 border-t border-[var(--border)] pt-3">
                  <button
                    type="button"
                    onClick={() => handlePrintCertificate(certificate.id)}
                    disabled={printingCertificateId === certificate.id}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-[var(--secondary)] text-xs font-bold text-[var(--secondary-foreground)] transition hover:opacity-90 active:scale-95 disabled:opacity-70"
                  >
                    <Printer className="size-3.5" />
                    {printingCertificateId === certificate.id ? "Menyiapkan..." : "Cetak"}
                  </button>
                  <Link
                    href={`/student/enrollments/${certificate.enrollment_id}`}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] text-xs font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-hover)] active:scale-95"
                  >
                    <ExternalLink className="size-3.5" />
                    Lihat Kelas
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
