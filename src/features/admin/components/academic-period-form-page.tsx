"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { StatusBadge } from "@/features/admin/components/status-badge";
import {
  getAcademicPeriodById,
  getOfferingsByPeriodCode,
  type AcademicPeriodRecord,
  type AcademicPeriodStatus,
} from "@/features/admin/data/offering-data";

type AcademicPeriodFormMode = "create" | "edit";

interface AcademicPeriodFormPageProps {
  mode: AcademicPeriodFormMode;
  periodId?: number;
}

function fallbackPeriod(): AcademicPeriodRecord {
  return {
    id: 0,
    code: "",
    name: "",
    startAt: "",
    endAt: "",
    enrollmentOpenAt: "",
    enrollmentCloseAt: "",
    status: "Upcoming",
  };
}

export function AcademicPeriodFormPage({ mode, periodId }: AcademicPeriodFormPageProps) {
  const sourcePeriod = useMemo(() => {
    if (mode === "edit" && typeof periodId === "number") {
      return getAcademicPeriodById(periodId);
    }
    return fallbackPeriod();
  }, [mode, periodId]);

  const initialPeriod = sourcePeriod ?? fallbackPeriod();
  const [code, setCode] = useState(initialPeriod.code);
  const [name, setName] = useState(initialPeriod.name);
  const [startAt, setStartAt] = useState(initialPeriod.startAt);
  const [endAt, setEndAt] = useState(initialPeriod.endAt);
  const [enrollmentOpenAt, setEnrollmentOpenAt] = useState(initialPeriod.enrollmentOpenAt);
  const [enrollmentCloseAt, setEnrollmentCloseAt] = useState(initialPeriod.enrollmentCloseAt);
  const [status, setStatus] = useState<AcademicPeriodStatus>(initialPeriod.status);

  const offeringsInPeriod = useMemo(() => getOfferingsByPeriodCode(code), [code]);
  const publishedCount = offeringsInPeriod.filter((item) => item.status === "Published").length;
  const draftCount = offeringsInPeriod.filter((item) => item.status === "Draft").length;
  const totalEnrollment = offeringsInPeriod.reduce((sum, item) => sum + item.enrolled, 0);
  const totalCapacity = offeringsInPeriod.reduce((sum, item) => sum + item.capacity, 0);
  const avgFillRate = totalCapacity > 0 ? Math.round((totalEnrollment / totalCapacity) * 100) : 0;

  return (
    <section className="space-y-5">
      <AdminPageHeader
        title={mode === "edit" ? "Detail Academic Period" : "Buat Academic Period"}
        description={
          mode === "edit"
            ? "Kelola informasi dan pengaturan periode akademik."
            : "Buat periode akademik baru sebagai acuan batch/offering."
        }
      />

      <div className="flex justify-end">
        <Button
          render={<Link href="/admin/academic-periods" />}
          type="button"
          variant="outline"
          size="lg"
          className="h-10 rounded-xl border-[var(--border)] bg-[var(--card)] px-4"
        >
          <ArrowLeft className="size-4" />
          <span>Kembali ke Daftar Periode</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm xl:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-[var(--foreground)]">Informasi Periode Akademik</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="period-code">Kode Periode</Label>
              <Input
                id="period-code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="Contoh: PRE-U-2026-A"
                className="border-[var(--border)] bg-[var(--card)]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="period-name">Nama Periode</Label>
              <Input
                id="period-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Contoh: Januari 2026 - April 2026"
                className="border-[var(--border)] bg-[var(--card)]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="period-start">Tanggal Mulai Akademik</Label>
              <Input
                id="period-start"
                value={startAt}
                onChange={(event) => setStartAt(event.target.value)}
                placeholder="DD MMM YYYY"
                className="border-[var(--border)] bg-[var(--card)]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="period-end">Tanggal Selesai Akademik</Label>
              <Input
                id="period-end"
                value={endAt}
                onChange={(event) => setEndAt(event.target.value)}
                placeholder="DD MMM YYYY"
                className="border-[var(--border)] bg-[var(--card)]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="period-enrollment-open">Enrollment Open (Buka Pendaftaran)</Label>
              <Input
                id="period-enrollment-open"
                value={enrollmentOpenAt}
                onChange={(event) => setEnrollmentOpenAt(event.target.value)}
                placeholder="DD MMM YYYY"
                className="border-[var(--border)] bg-[var(--card)]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="period-enrollment-close">Enrollment Close (Tutup Pendaftaran)</Label>
              <Input
                id="period-enrollment-close"
                value={enrollmentCloseAt}
                onChange={(event) => setEnrollmentCloseAt(event.target.value)}
                placeholder="DD MMM YYYY"
                className="border-[var(--border)] bg-[var(--card)]"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="period-status">Status Periode</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as AcademicPeriodStatus)}>
                <SelectTrigger id="period-status" className="border-[var(--border)] bg-[var(--card)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Upcoming">Upcoming</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-[var(--foreground)]">Ringkasan Periode</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2">
              <span className="text-[var(--muted-foreground)]">Total Offering</span>
              <span className="font-semibold text-[var(--foreground)]">{offeringsInPeriod.length}</span>
            </div>
            <div className="flex items-center justify-between rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2">
              <span className="text-[var(--muted-foreground)]">Offering Published</span>
              <span className="font-semibold text-[var(--foreground)]">{publishedCount}</span>
            </div>
            <div className="flex items-center justify-between rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2">
              <span className="text-[var(--muted-foreground)]">Offering Draft</span>
              <span className="font-semibold text-[var(--foreground)]">{draftCount}</span>
            </div>
            <div className="flex items-center justify-between rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2">
              <span className="text-[var(--muted-foreground)]">Enrollment Total</span>
              <span className="font-semibold text-[var(--foreground)]">{totalEnrollment}</span>
            </div>
            <div className="flex items-center justify-between rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2">
              <span className="text-[var(--muted-foreground)]">Kapasitas Total</span>
              <span className="font-semibold text-[var(--foreground)]">{totalCapacity}</span>
            </div>
            <div className="flex items-center justify-between rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2">
              <span className="text-[var(--muted-foreground)]">Rata-rata Fill Rate</span>
              <span className="font-semibold text-[var(--foreground)]">{avgFillRate}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-[var(--foreground)]">Daftar Offering dalam Periode Ini</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--border)]">
              <thead className="bg-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                    Course
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                    Peserta
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                    Kapasitas
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                    Fill Rate
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] bg-[var(--card)]">
                {offeringsInPeriod.length > 0 ? (
                  offeringsInPeriod.map((offering) => {
                    const fillRate = offering.capacity > 0 ? Math.round((offering.enrolled / offering.capacity) * 100) : 0;
                    return (
                      <tr key={offering.id}>
                        <td className="px-4 py-3 text-sm font-medium text-[var(--foreground)]">{offering.courseTitle}</td>
                        <td className="px-4 py-3 text-sm text-[var(--foreground)]">{offering.enrolled}</td>
                        <td className="px-4 py-3 text-sm text-[var(--foreground)]">{offering.capacity}</td>
                        <td className="px-4 py-3 text-sm text-[var(--foreground)]">{fillRate}%</td>
                        <td className="px-4 py-3 text-sm">
                          <StatusBadge value={offering.status} />
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-5 text-center text-sm text-[var(--muted-foreground)]">
                      Belum ada offering yang terhubung ke periode ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="sticky bottom-4 z-20">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[var(--border)] bg-[var(--card)] p-3 shadow-lg">
          <p className="text-xs text-[var(--muted-foreground)]">
            {mode === "edit" ? "Step 2/4: Settings" : "Buat Periode Akademik"}
          </p>
          <p className="text-xs text-[var(--muted-foreground)]">Semua perubahan tersimpan.</p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => toast.success("Data periode berhasil disimpan.")}
              className="border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
            >
              <Save className="size-4" />
              <span>Simpan</span>
            </Button>
            <Button
              type="button"
              onClick={() => toast.success("Periode akademik diaktifkan.")}
              className="bg-[var(--primary)] text-[var(--primary-foreground)] hover:brightness-95"
            >
              <Check className="size-4" />
              <span>Aktifkan Periode</span>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
