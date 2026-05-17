"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Award, ExternalLink, Printer } from "lucide-react";
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
    return <p className="text-sm text-muted-foreground">Memuat sertifikat...</p>;
  }

  if (certificatesQuery.isError) {
    return <p className="text-sm text-red-600">Sertifikat tidak bisa dimuat.</p>;
  }

  const certificates = certificatesQuery.data ?? [];

  return (
    <section className="space-y-5">
      <header className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="inline-flex size-12 items-center justify-center rounded-xl bg-[var(--secondary)]/10 text-[var(--secondary)]">
            <Award className="size-6" />
          </span>
          <div>
            <h1 className="text-3xl font-semibold text-[var(--foreground)]">Certificates</h1>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              Sertifikat yang sudah diklaim akan muncul di sini dan bisa dibuka dalam mode cetak.
            </p>
          </div>
        </div>
      </header>

      {certificates.length ? (
        <div className="grid gap-4">
          {certificates.map((certificate) => (
            <article
              key={certificate.id}
              className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <p className="text-xs font-semibold tracking-[0.08em] text-[var(--muted-foreground)] uppercase">
                    Certificate
                  </p>
                  <h2 className="text-2xl font-semibold text-[var(--foreground)]">
                    {certificate.course?.title ?? `Course #${certificate.course_id}`}
                  </h2>
                  <div className="grid gap-1 text-sm text-[var(--muted-foreground)]">
                    <p>
                      Nomor sertifikat:{" "}
                      <span className="font-medium text-[var(--foreground)]">{certificate.certificate_number}</span>
                    </p>
                    <p>
                      Diterbitkan:{" "}
                      <span className="font-medium text-[var(--foreground)]">
                        {formatUtcDateTimeToJakarta(certificate.issued_at)}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => handlePrintCertificate(certificate.id)}
                    disabled={printingCertificateId === certificate.id}
                    className="inline-flex h-10 items-center gap-2 rounded-md bg-[var(--secondary)] px-4 text-sm font-semibold text-[var(--secondary-foreground)] transition hover:opacity-90"
                  >
                    <Printer className="size-4" />
                    {printingCertificateId === certificate.id ? "Menyiapkan..." : "Cetak Sertifikat"}
                  </button>
                  <Link
                    href={`/student/enrollments/${certificate.enrollment_id}`}
                    className="inline-flex h-10 items-center gap-2 rounded-md border border-[var(--border)] px-4 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-hover)]"
                  >
                    <ExternalLink className="size-4" />
                    Lihat Kelas
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--card)] p-10 text-center shadow-sm">
          <p className="text-lg font-medium text-[var(--foreground)]">Belum ada sertifikat</p>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            Selesaikan progress course sampai 100% dan tunggu semua assignment wajib disetujui.
          </p>
        </div>
      )}
    </section>
  );
}
