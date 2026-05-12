"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookmarkCheck,
  CalendarDays,
  CheckCircle2,
  Save,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { StatusBadge } from "@/features/admin/components/status-badge";
import {
  ACADEMIC_PERIOD_DATA,
  type CourseOfferingRecord,
  getCourseOfferingById,
} from "@/features/admin/data/offering-data";

type CourseOfferingFormMode = "create" | "edit";

interface CourseOfferingFormPageProps {
  mode: CourseOfferingFormMode;
  offeringId?: number;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function fallbackOfferingRecord(): CourseOfferingRecord {
  return {
    id: 0,
    courseTitle: "",
    courseCategory: "-",
    periodCode: "",
    periodLabel: "-",
    enrollmentWindowLabel: "-",
    studyWindowLabel: "-",
    enrollmentOpenAt: "",
    enrollmentCloseAt: "",
    startAt: "",
    endAt: "",
    enrolled: 0,
    capacity: 0,
    price: 0,
    discountPrice: null,
    status: "Draft",
  };
}

export function CourseOfferingFormPage({ mode, offeringId }: CourseOfferingFormPageProps) {
  const sourceOffering = useMemo(() => {
    if (mode === "edit" && typeof offeringId === "number") {
      return getCourseOfferingById(offeringId);
    }
    return fallbackOfferingRecord();
  }, [mode, offeringId]);

  const initialOffering = sourceOffering ?? fallbackOfferingRecord();
  const [courseTitle, setCourseTitle] = useState(initialOffering.courseTitle);
  const [periodCode, setPeriodCode] = useState(initialOffering.periodCode);
  const [startAt, setStartAt] = useState(initialOffering.startAt);
  const [endAt, setEndAt] = useState(initialOffering.endAt);
  const [enrollmentOpenAt, setEnrollmentOpenAt] = useState(initialOffering.enrollmentOpenAt);
  const [enrollmentCloseAt, setEnrollmentCloseAt] = useState(initialOffering.enrollmentCloseAt);
  const [capacity, setCapacity] = useState(String(initialOffering.capacity || ""));
  const [price, setPrice] = useState(String(initialOffering.price || ""));
  const [discountPrice, setDiscountPrice] = useState(
    initialOffering.discountPrice !== null ? String(initialOffering.discountPrice) : "",
  );
  const [status, setStatus] = useState<"Draft" | "Published">(
    initialOffering.status === "Published" ? "Published" : "Draft",
  );

  const periodOptions = useMemo(
    () =>
      ACADEMIC_PERIOD_DATA.map((period) => {
        const labelChunks = [period.code?.trim(), period.name?.trim()].filter(Boolean);
        return {
          value: period.code,
          label: labelChunks.length > 0 ? labelChunks.join(" - ") : period.code,
        };
      }),
    [],
  );
  const selectedPeriodLabel =
    periodOptions.find((periodOption) => periodOption.value === periodCode)?.label ?? "Pilih periode akademik";
  const selectedPeriod = ACADEMIC_PERIOD_DATA.find((period) => period.code === periodCode);
  const parsedCapacity = Number(capacity || 0);
  const enrolledCount = initialOffering.enrolled;
  const fillRate = parsedCapacity > 0 ? Math.round((enrolledCount / parsedCapacity) * 100) : 0;
  const parsedPrice = Number(price || 0);
  const parsedDiscount = Number(discountPrice || 0);
  const finalPrice = parsedDiscount > 0 && parsedDiscount < parsedPrice ? parsedDiscount : parsedPrice;

  return (
    <section className="space-y-5">
      <AdminPageHeader
        title={mode === "edit" ? `Detail Course Offering - ${initialOffering.courseTitle}` : "Buat Course Offering"}
        description={
          mode === "edit"
            ? `Periode Akademik ${initialOffering.periodCode || "-"}`
            : "Atur batch/offering course untuk periode akademik yang dipilih."
        }
      />

      <div className="flex justify-end">
        <Button
          render={<Link href="/admin/course-offerings" />}
          type="button"
          variant="outline"
          size="lg"
          className="h-10 rounded-xl border-[var(--border)] bg-[var(--card)] px-4"
        >
          <ArrowLeft className="size-4" />
          <span>Kembali ke Daftar Offering</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <CardContent className="flex items-center gap-3 p-4">
            <span className="inline-flex size-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <Users className="size-5" />
            </span>
            <div>
              <p className="text-xs text-[var(--muted-foreground)]">Total Peserta</p>
              <p className="text-base font-semibold text-[var(--foreground)]">
                {enrolledCount} / {parsedCapacity || 0}
              </p>
              <p className="text-xs text-[var(--muted-foreground)]">{fillRate}% dari kapasitas</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <CardContent className="flex items-center gap-3 p-4">
            <span className="inline-flex size-10 items-center justify-center rounded-full bg-teal-100 text-teal-700">
              <BookmarkCheck className="size-5" />
            </span>
            <div>
              <p className="text-xs text-[var(--muted-foreground)]">Status Offering</p>
              <StatusBadge value={status} />
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                {status === "Published" ? "Ditampilkan di katalog" : "Belum tampil di katalog"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <CardContent className="flex items-center gap-3 p-4">
            <span className="inline-flex size-10 items-center justify-center rounded-full bg-sky-100 text-sky-700">
              <CalendarDays className="size-5" />
            </span>
            <div>
              <p className="text-xs text-[var(--muted-foreground)]">Window Pendaftaran</p>
              <p className="text-sm font-semibold text-[var(--foreground)]">{initialOffering.enrollmentWindowLabel}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <CardContent className="flex items-center gap-3 p-4">
            <span className="inline-flex size-10 items-center justify-center rounded-full bg-violet-100 text-violet-700">
              <CheckCircle2 className="size-5" />
            </span>
            <div>
              <p className="text-xs text-[var(--muted-foreground)]">Window Belajar</p>
              <p className="text-sm font-semibold text-[var(--foreground)]">{initialOffering.studyWindowLabel}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm xl:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-[var(--foreground)]">Informasi Offering</CardTitle>
            <p className="text-xs text-[var(--muted-foreground)]">Atur detail umum untuk offering ini.</p>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="offering-course-title">Course (Master)</Label>
              <Input
                id="offering-course-title"
                value={courseTitle}
                onChange={(event) => setCourseTitle(event.target.value)}
                placeholder="Contoh: Intro Programming"
                className="border-[var(--border)] bg-[var(--card)]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="offering-period">Academic Period</Label>
              <Select value={periodCode} onValueChange={(value) => setPeriodCode(value ?? "")}>
                <SelectTrigger id="offering-period" className="border-[var(--border)] bg-[var(--card)]">
                  <SelectValue>{selectedPeriodLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {periodOptions.map((periodOption) => (
                    <SelectItem key={periodOption.value} value={periodOption.value}>
                      {periodOption.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="offering-status">Status Offering</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as "Draft" | "Published")}>
                <SelectTrigger id="offering-status" className="border-[var(--border)] bg-[var(--card)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="offering-start-date">Start Date (Mulai Belajar)</Label>
              <Input
                id="offering-start-date"
                value={startAt}
                onChange={(event) => setStartAt(event.target.value)}
                placeholder="DD/MM/YYYY"
                className="border-[var(--border)] bg-[var(--card)]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="offering-end-date">End Date (Selesai Belajar)</Label>
              <Input
                id="offering-end-date"
                value={endAt}
                onChange={(event) => setEndAt(event.target.value)}
                placeholder="DD/MM/YYYY"
                className="border-[var(--border)] bg-[var(--card)]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="offering-enrollment-open">Enrollment Open</Label>
              <Input
                id="offering-enrollment-open"
                value={enrollmentOpenAt}
                onChange={(event) => setEnrollmentOpenAt(event.target.value)}
                placeholder="DD/MM/YYYY"
                className="border-[var(--border)] bg-[var(--card)]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="offering-enrollment-close">Enrollment Close</Label>
              <Input
                id="offering-enrollment-close"
                value={enrollmentCloseAt}
                onChange={(event) => setEnrollmentCloseAt(event.target.value)}
                placeholder="DD/MM/YYYY"
                className="border-[var(--border)] bg-[var(--card)]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="offering-capacity">Capacity (Kapasitas)</Label>
              <Input
                id="offering-capacity"
                type="number"
                min={0}
                value={capacity}
                onChange={(event) => setCapacity(event.target.value)}
                className="border-[var(--border)] bg-[var(--card)]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="offering-price">Price (Harga)</Label>
              <Input
                id="offering-price"
                type="number"
                min={0}
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                className="border-[var(--border)] bg-[var(--card)]"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="offering-discount">Discount (Diskon)</Label>
              <Input
                id="offering-discount"
                type="number"
                min={0}
                value={discountPrice}
                onChange={(event) => setDiscountPrice(event.target.value)}
                className="border-[var(--border)] bg-[var(--card)]"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-[var(--foreground)]">Ringkasan Offering</CardTitle>
            <p className="text-xs text-[var(--muted-foreground)]">Snapshot untuk validasi cepat sebelum publish.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-md border border-[var(--border)] bg-[var(--surface-soft)] p-3">
              <p className="text-xs text-[var(--muted-foreground)]">Final Price</p>
              <p className="text-lg font-semibold text-[var(--foreground)]">{formatCurrency(finalPrice)}</p>
            </div>
            <div className="rounded-md border border-[var(--border)] bg-[var(--surface-soft)] p-3">
              <p className="text-xs text-[var(--muted-foreground)]">Periode Terpilih</p>
              <p className="text-sm font-medium text-[var(--foreground)]">{selectedPeriod?.name ?? "-"}</p>
              <p className="text-xs text-[var(--muted-foreground)]">{selectedPeriod?.code ?? "-"}</p>
            </div>
            <div className="rounded-md border border-[var(--border)] bg-[var(--surface-soft)] p-3">
              <p className="text-xs text-[var(--muted-foreground)]">Kapasitas</p>
              <p className="text-sm font-medium text-[var(--foreground)]">
                {enrolledCount} siswa terdaftar dari {parsedCapacity || 0} seat
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="sticky bottom-4 z-20">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[var(--border)] bg-[var(--card)] p-3 shadow-lg">
          <p className="text-xs text-[var(--muted-foreground)]">
            {mode === "edit" ? "Step 1/4: Informasi Offering" : "Buat Offering Baru"}
          </p>
          <p className="text-xs text-[var(--muted-foreground)]">Semua perubahan tersimpan.</p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => toast.success("Draft offering tersimpan.")}
              className="border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
            >
              <Save className="size-4" />
              <span>Simpan Draft</span>
            </Button>
            <Button
              type="button"
              onClick={() => toast.success("Offering dipublish ke katalog student.")}
              className="bg-[var(--primary)] text-[var(--primary-foreground)] hover:brightness-95"
            >
              <CheckCircle2 className="size-4" />
              <span>Publish Offering</span>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
