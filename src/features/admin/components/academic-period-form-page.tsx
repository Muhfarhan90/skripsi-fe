"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, Check, Loader2, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { StatusBadge } from "@/features/admin/components/status-badge";
import {
  createAdminAcademicPeriod,
  deleteAdminAcademicPeriod,
  getAdminAcademicPeriodById,
  updateAdminAcademicPeriod,
  type AcademicPeriodPayload,
  type AdminAcademicPeriod,
} from "@/features/admin/api/master-api";
import { useUnsavedChangesGuard } from "@/features/admin/hooks/use-unsaved-changes-guard";
import {
  formatCurrency,
  toApiDateTimeOrNull,
  toDateTimeLocalInput,
} from "@/features/admin/lib/offering-utils";
import { ApiError } from "@/lib/api/client";

type AcademicPeriodFormMode = "create" | "edit";

interface AcademicPeriodFormPageProps {
  mode: AcademicPeriodFormMode;
  periodId?: number;
}

interface AcademicPeriodFormState {
  code: string;
  name: string;
  start_at: string;
  end_at: string;
  enrollment_open_at: string;
  enrollment_close_at: string;
  is_active: boolean;
}

type AcademicPeriodFormErrors = Partial<Record<keyof AcademicPeriodFormState | "form", string>>;

const defaultForm: AcademicPeriodFormState = {
  code: "",
  name: "",
  start_at: "",
  end_at: "",
  enrollment_open_at: "",
  enrollment_close_at: "",
  is_active: false,
};

function mapPeriodToFormState(period: AdminAcademicPeriod): AcademicPeriodFormState {
  return {
    code: period.code ?? "",
    name: period.name ?? "",
    start_at: toDateTimeLocalInput(period.start_at),
    end_at: toDateTimeLocalInput(period.end_at),
    enrollment_open_at: toDateTimeLocalInput(period.enrollment_open_at),
    enrollment_close_at: toDateTimeLocalInput(period.enrollment_close_at),
    is_active: Boolean(period.is_active),
  };
}

function toTimestamp(value: string): number | null {
  const normalized = value.trim();
  if (!normalized) return null;

  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return null;

  return date.getTime();
}

function toAmount(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;

  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return null;

  return parsed;
}

function buildPayload(form: AcademicPeriodFormState): AcademicPeriodPayload {
  const startAt = toApiDateTimeOrNull(form.start_at);
  const endAt = toApiDateTimeOrNull(form.end_at);
  const enrollmentOpenAt = toApiDateTimeOrNull(form.enrollment_open_at);
  const enrollmentCloseAt = toApiDateTimeOrNull(form.enrollment_close_at);

  if (!startAt || !endAt || !enrollmentOpenAt || !enrollmentCloseAt) {
    throw new Error("Tanggal periode akademik tidak valid");
  }

  return {
    code: form.code.trim(),
    name: form.name.trim(),
    start_at: startAt,
    end_at: endAt,
    enrollment_open_at: enrollmentOpenAt,
    enrollment_close_at: enrollmentCloseAt,
    is_active: form.is_active,
  };
}

function validateForm(form: AcademicPeriodFormState): AcademicPeriodFormErrors {
  const errors: AcademicPeriodFormErrors = {};

  if (!form.code.trim()) errors.code = "Kode periode wajib diisi";
  if (!form.name.trim()) errors.name = "Nama periode wajib diisi";
  if (!form.start_at.trim()) errors.start_at = "Tanggal mulai akademik wajib diisi";
  if (!form.end_at.trim()) errors.end_at = "Tanggal selesai akademik wajib diisi";
  if (!form.enrollment_open_at.trim()) errors.enrollment_open_at = "Tanggal buka pendaftaran wajib diisi";
  if (!form.enrollment_close_at.trim()) errors.enrollment_close_at = "Tanggal tutup pendaftaran wajib diisi";

  const startAt = toTimestamp(form.start_at);
  const endAt = toTimestamp(form.end_at);
  const enrollmentOpenAt = toTimestamp(form.enrollment_open_at);
  const enrollmentCloseAt = toTimestamp(form.enrollment_close_at);

  if (form.start_at.trim() && startAt === null) {
    errors.start_at = "Format tanggal mulai akademik tidak valid";
  }

  if (form.end_at.trim() && endAt === null) {
    errors.end_at = "Format tanggal selesai akademik tidak valid";
  }

  if (form.enrollment_open_at.trim() && enrollmentOpenAt === null) {
    errors.enrollment_open_at = "Format tanggal buka pendaftaran tidak valid";
  }

  if (form.enrollment_close_at.trim() && enrollmentCloseAt === null) {
    errors.enrollment_close_at = "Format tanggal tutup pendaftaran tidak valid";
  }

  if (startAt !== null && endAt !== null && endAt <= startAt) {
    errors.end_at = "Tanggal selesai akademik harus setelah tanggal mulai";
  }

  if (enrollmentOpenAt !== null && enrollmentCloseAt !== null && enrollmentCloseAt <= enrollmentOpenAt) {
    errors.enrollment_close_at = "Tanggal tutup pendaftaran harus setelah tanggal buka";
  }

  return errors;
}

function mapApiError(error: unknown): AcademicPeriodFormErrors {
  if (!(error instanceof ApiError)) {
    return {
      form: error instanceof Error ? error.message : "Terjadi kesalahan tak terduga",
    };
  }

  const fieldErrors: AcademicPeriodFormErrors = {};
  const knownKeys = new Set<keyof AcademicPeriodFormState>(Object.keys(defaultForm) as Array<keyof AcademicPeriodFormState>);

  if (error.errors) {
    Object.entries(error.errors).forEach(([key, value]) => {
      const firstMessage = Array.isArray(value) ? String(value[0]) : String(value);
      if (!firstMessage) return;

      if (knownKeys.has(key as keyof AcademicPeriodFormState)) {
        fieldErrors[key as keyof AcademicPeriodFormState] = firstMessage;
      } else if (!fieldErrors.form) {
        fieldErrors.form = firstMessage;
      }
    });
  }

  if (!fieldErrors.form) {
    fieldErrors.form = error.message;
  }

  return fieldErrors;
}

function isNotFoundError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

function getPersistHint(isEditing: boolean, isActive: boolean): string {
  if (!isEditing) {
    return "Periode baru akan tersimpan sebagai nonaktif sampai Anda mengaktifkannya.";
  }

  return isActive
    ? "Perubahan disimpan tanpa menutup akses period yang sedang aktif."
    : "Perubahan disimpan tanpa mengaktifkan period.";
}

export function AcademicPeriodFormPage({ mode, periodId }: AcademicPeriodFormPageProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEditing = mode === "edit";
  const periodHubHref = "/admin/academic-periods";
  const [draftForm, setDraftForm] = useState<AcademicPeriodFormState | null>(null);
  const [formErrors, setFormErrors] = useState<AcademicPeriodFormErrors>({});
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [nowTimestamp] = useState(() => Date.now());

  const periodDetailQuery = useQuery({
    queryKey: ["admin", "academic-periods", periodId],
    queryFn: () => getAdminAcademicPeriodById(periodId as number),
    enabled: isEditing && Boolean(periodId),
  });

  const baseForm = useMemo<AcademicPeriodFormState>(() => {
    if (isEditing && periodDetailQuery.data) {
      return mapPeriodToFormState(periodDetailQuery.data);
    }

    return defaultForm;
  }, [isEditing, periodDetailQuery.data]);

  const form = draftForm ?? baseForm;
  const relatedOfferings = periodDetailQuery.data?.course_offerings ?? [];
  const activeOfferingCount = relatedOfferings.filter((item) => item.is_active).length;
  const inactiveOfferingCount = relatedOfferings.length - activeOfferingCount;
  const totalEnrollment = relatedOfferings.reduce((sum, item) => sum + Number(item.enrollments_count ?? 0), 0);
  const totalCapacity = relatedOfferings.reduce((sum, item) => sum + Number(item.capacity ?? 0), 0);
  const seatUtilization = totalCapacity > 0 ? Math.round((totalEnrollment / totalCapacity) * 100) : 0;
  const enrollmentOpenAt = toTimestamp(form.enrollment_open_at);
  const enrollmentCloseAt = toTimestamp(form.enrollment_close_at);
  const isEnrollmentOpenNow =
    enrollmentOpenAt !== null &&
    enrollmentCloseAt !== null &&
    enrollmentOpenAt <= nowTimestamp &&
    nowTimestamp <= enrollmentCloseAt;
  const persistHint = getPersistHint(isEditing, form.is_active);
  const activationAction =
    form.is_active
      ? {
          label: "Nonaktifkan Period",
          nextIsActive: false,
        }
      : {
          label: "Aktifkan Period",
          nextIsActive: true,
        };
  const isDirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(baseForm), [baseForm, form]);
  const { confirmLeave } = useUnsavedChangesGuard(isDirty);

  const setForm = (updater: (prev: AcademicPeriodFormState) => AcademicPeriodFormState) => {
    setDraftForm((prev) => updater(prev ?? baseForm));
  };

  const saveMutation = useMutation({
    mutationFn: (payload: AcademicPeriodPayload) => {
      if (isEditing) {
        return updateAdminAcademicPeriod(periodId as number, payload);
      }

      return createAdminAcademicPeriod(payload);
    },
    onSuccess: (savedPeriod) => {
      queryClient.setQueryData(["admin", "academic-periods", savedPeriod.id], savedPeriod);
      queryClient.invalidateQueries({ queryKey: ["admin", "academic-periods"] });
      toast.success(isEditing ? "Periode akademik berhasil diperbarui" : "Periode akademik berhasil dibuat");
      setFormErrors({});

      if (!isEditing) {
        router.replace(`/admin/academic-periods/${savedPeriod.id}`);
        router.refresh();
        return;
      }

      setDraftForm(null);
    },
    onError: (error) => {
      const nextErrors = mapApiError(error);
      setFormErrors(nextErrors);
      toast.error(nextErrors.form ?? "Gagal menyimpan periode akademik");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAdminAcademicPeriod,
    onSuccess: (message) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "academic-periods"] });
      toast.success(message || "Periode akademik berhasil dihapus");
      router.push(periodHubHref);
      router.refresh();
    },
    onError: (error) => {
      const nextErrors = mapApiError(error);
      setFormErrors(nextErrors);
      toast.error(nextErrors.form ?? "Gagal menghapus periode akademik");
    },
  });

  const persistForm = (nextIsActive?: boolean) => {
    const nextForm = nextIsActive === undefined ? form : { ...form, is_active: nextIsActive };
    const validationErrors = validateForm(nextForm);

    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      return;
    }

    setFormErrors({});
    saveMutation.mutate(buildPayload(nextForm));
  };

  if (isEditing && periodDetailQuery.isLoading) {
    return (
      <section className="space-y-5">
        <AdminPageHeader title="Detail Academic Period" description="Memuat detail periode akademik..." />
        <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <CardContent className="flex items-center gap-2 p-5 text-sm text-[var(--muted-foreground)]">
            <Loader2 className="size-4 animate-spin" />
            Memuat data periode akademik...
          </CardContent>
        </Card>
      </section>
    );
  }

  if (isEditing && periodDetailQuery.isError) {
    return (
      <section className="space-y-5">
        <AdminPageHeader
          title="Detail Academic Period"
          description="Data periode akademik tidak dapat dimuat."
        />
        <Card className="border border-[var(--danger-soft-border)] bg-[var(--danger-soft-bg)] shadow-sm">
          <CardContent className="space-y-3 p-5">
            <p className="text-sm text-[var(--danger-soft-foreground)]">
              {isNotFoundError(periodDetailQuery.error)
                ? "Periode akademik tidak ditemukan."
                : "Gagal memuat data periode akademik."}
            </p>
            <Button type="button" variant="outline" onClick={() => router.push(periodHubHref)}>
              <ArrowLeft className="size-4" />
              <span>Kembali ke daftar periode</span>
            </Button>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <AdminPageHeader
        title={isEditing ? "Detail Academic Period" : "Buat Academic Period"}
        description={
          isEditing
            ? "Kelola informasi period dan tambah course offering dari halaman ini."
            : "Buat periode akademik baru sebagai acuan batch dan course offering."
        }
      />

      <div className="flex flex-wrap justify-end gap-2">
        <Button
          render={<Link href={periodHubHref} />}
          type="button"
          variant="outline"
          size="lg"
          className="h-10 rounded-xl border-[var(--border)] bg-[var(--card)] px-4"
          onClick={(event) => {
            if (confirmLeave()) return;
            event.preventDefault();
          }}
        >
          <ArrowLeft className="size-4" />
          <span>Kembali ke Daftar Periode</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-3">
        <Card className="self-start border border-[var(--border)] bg-[var(--card)] shadow-sm xl:col-span-2">
          <CardHeader className="space-y-2 pb-2">
            <CardTitle className="text-base font-semibold text-[var(--foreground)]">Informasi Periode Akademik</CardTitle>
            <p className="text-sm text-[var(--muted-foreground)]">
              Lengkapi atribut utama period tanpa perlu berpindah ke banyak panel ringkasan.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {formErrors.form ? (
              <div className="flex items-start gap-2 rounded-md border border-[var(--danger-soft-border)] bg-[var(--danger-soft-bg)] px-3 py-2 text-sm text-[var(--danger-soft-foreground)]">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>{formErrors.form}</span>
              </div>
            ) : null}

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-[var(--foreground)]">Atribut Period</h3>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  Semua field inti academic period dikelompokkan dalam satu area agar lebih mudah dibaca.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="period-code">Kode Periode</Label>
                  <Input
                    id="period-code"
                    value={form.code}
                    onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
                    placeholder="Contoh: PRE-U-2026-A"
                    className="border-[var(--border)] bg-[var(--card)]"
                  />
                  {formErrors.code ? <p className="text-xs text-red-600">{formErrors.code}</p> : null}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="period-name">Nama Periode</Label>
                  <Input
                    id="period-name"
                    value={form.name}
                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder="Contoh: Januari 2026 - April 2026"
                    className="border-[var(--border)] bg-[var(--card)]"
                  />
                  {formErrors.name ? <p className="text-xs text-red-600">{formErrors.name}</p> : null}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="period-start">Tanggal Mulai Akademik</Label>
                  <DateTimePicker
                    value={form.start_at}
                    onChange={(value) => setForm((prev) => ({ ...prev, start_at: value }))}
                    placeholder="Pilih tanggal mulai akademik"
                    className="border-[var(--border)] bg-[var(--card)]"
                  />
                  {formErrors.start_at ? <p className="text-xs text-red-600">{formErrors.start_at}</p> : null}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="period-end">Tanggal Selesai Akademik</Label>
                  <DateTimePicker
                    value={form.end_at}
                    onChange={(value) => setForm((prev) => ({ ...prev, end_at: value }))}
                    placeholder="Pilih tanggal selesai akademik"
                    className="border-[var(--border)] bg-[var(--card)]"
                  />
                  {formErrors.end_at ? <p className="text-xs text-red-600">{formErrors.end_at}</p> : null}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="period-enrollment-open">Enrollment Open</Label>
                  <DateTimePicker
                    value={form.enrollment_open_at}
                    onChange={(value) => setForm((prev) => ({ ...prev, enrollment_open_at: value }))}
                    placeholder="Pilih enrollment open"
                    className="border-[var(--border)] bg-[var(--card)]"
                  />
                  {formErrors.enrollment_open_at ? (
                    <p className="text-xs text-red-600">{formErrors.enrollment_open_at}</p>
                  ) : null}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="period-enrollment-close">Enrollment Close</Label>
                  <DateTimePicker
                    value={form.enrollment_close_at}
                    onChange={(value) => setForm((prev) => ({ ...prev, enrollment_close_at: value }))}
                    placeholder="Pilih enrollment close"
                    className="border-[var(--border)] bg-[var(--card)]"
                  />
                  {formErrors.enrollment_close_at ? (
                    <p className="text-xs text-red-600">{formErrors.enrollment_close_at}</p>
                  ) : null}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="self-start border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <CardHeader className="space-y-1 pb-2">
            <CardTitle className="text-base font-semibold text-[var(--foreground)]">Statistik Period</CardTitle>
            <p className="text-sm text-[var(--muted-foreground)]">
              Snapshot performa offering yang berjalan di period ini.
            </p>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
              <p className="text-xs font-medium tracking-wide text-sky-700 uppercase">Total Offering</p>
              <p className="mt-2 text-2xl font-semibold text-sky-900">{relatedOfferings.length}</p>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-xs font-medium tracking-wide text-emerald-700 uppercase">Active Offering</p>
              <p className="mt-2 text-2xl font-semibold text-emerald-900">{activeOfferingCount}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium tracking-wide text-slate-700 uppercase">Inactive Offering</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{inactiveOfferingCount}</p>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-medium tracking-wide text-amber-700 uppercase">Total Enrollment</p>
              <p className="mt-2 text-2xl font-semibold text-amber-900">{totalEnrollment}</p>
            </div>

            <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4">
              <p className="text-xs font-medium tracking-wide text-teal-700 uppercase">Enrollment Open</p>
              <p className="mt-2 text-xl font-semibold text-teal-900">{isEnrollmentOpenNow ? "Open" : "Closed"}</p>
            </div>

            <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
              <p className="text-xs font-medium tracking-wide text-violet-700 uppercase">Seat Utilization</p>
              <p className="mt-2 text-2xl font-semibold text-violet-900">{seatUtilization}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
        <CardHeader className="flex flex-col gap-3 pb-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base font-semibold text-[var(--foreground)]">Daftar Offering dalam Periode Ini</CardTitle>
          {isEditing && periodId ? (
            <Button
              render={<Link href={`/admin/academic-periods/${periodId}/offerings/new`} />}
              type="button"
              className="bg-[var(--primary)] text-[var(--primary-foreground)] hover:brightness-95"
              onClick={(event) => {
                if (confirmLeave()) return;
                event.preventDefault();
              }}
            >
              <Plus className="size-4" />
              <span>Tambah Offering</span>
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table className="min-w-[980px]">
            <TableHeader className="bg-[var(--muted)]">
              <TableRow className="hover:bg-[var(--muted)]">
                <TableHead>Course</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Harga</TableHead>
                <TableHead>Peserta</TableHead>
                <TableHead>Kapasitas</TableHead>
                <TableHead>Fill Rate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="bg-[var(--card)]">
                {relatedOfferings.length > 0 ? (
                  relatedOfferings.map((offering) => {
                    const enrolledCount = Number(offering.enrollments_count ?? 0);
                    const capacity = Number(offering.capacity ?? 0);
                    const fillRate = capacity > 0 ? Math.round((enrolledCount / capacity) * 100) : 0;
                    const price = toAmount(offering.price);
                    const discountPrice = toAmount(offering.discount_price);
                    const hasDiscount =
                      price !== null &&
                      discountPrice !== null &&
                      discountPrice >= 0 &&
                      discountPrice < price;
                    const finalPrice = hasDiscount ? discountPrice : price;
                    const fillRateClasses =
                      fillRate === 0
                        ? "border-slate-200 bg-slate-50 text-slate-600"
                        : fillRate < 50
                          ? "border-amber-200 bg-amber-50 text-amber-700"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700";

                    return (
                      <TableRow key={offering.id}>
                        <TableCell className="text-sm">
                          <p className="font-medium text-[var(--foreground)]">
                            {offering.course?.title ?? "-"}
                          </p>
                        </TableCell>
                        <TableCell className="text-sm text-[var(--muted-foreground)]">
                          {offering.course?.category?.name ?? "-"}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {finalPrice !== null ? (
                            <div className="space-y-0.5">
                              {hasDiscount && price !== null ? (
                                <p className="text-xs text-[var(--muted-foreground)] line-through">
                                  {formatCurrency(price)}
                                </p>
                              ) : null}
                              <p className="font-semibold text-[var(--foreground)]">{formatCurrency(finalPrice)}</p>
                            </div>
                          ) : (
                            <span className="text-[var(--muted-foreground)]">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="inline-flex min-w-[72px] flex-col rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-center text-sky-700">
                            <span className="text-sm font-semibold leading-none">{enrolledCount}</span>
                            <span className="mt-1 text-[11px] font-medium">siswa</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="inline-flex min-w-[72px] flex-col rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-center text-amber-700">
                            <span className="text-sm font-semibold leading-none">{capacity}</span>
                            <span className="mt-1 text-[11px] font-medium">seat</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className={`inline-flex min-w-[72px] flex-col rounded-lg border px-2.5 py-1.5 text-center ${fillRateClasses}`}>
                            <span className="text-sm font-semibold leading-none">{fillRate}%</span>
                            <span className="mt-1 text-[11px] font-medium">terisi</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          <StatusBadge value={offering.is_active ? "Aktif" : "Nonaktif"} />
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end">
                            <Button
                              render={<Link href={`/admin/academic-periods/${periodId}/offerings/${offering.id}`} />}
                              type="button"
                              variant="outline"
                              size="icon-sm"
                              className="border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]"
                              aria-label={`Buka offering ${offering.course?.title ?? offering.id}`}
                              onClick={(event) => {
                                if (confirmLeave()) return;
                                event.preventDefault();
                              }}
                            >
                              <Pencil className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="py-5 text-center text-sm text-[var(--muted-foreground)]">
                      {isEditing
                        ? "Belum ada offering yang terhubung ke periode ini."
                        : "Offering akan muncul setelah periode disimpan dan dipakai oleh batch."}
                      {isEditing && periodId ? (
                        <span className="mt-3 block">
                          <Button
                            render={<Link href={`/admin/academic-periods/${periodId}/offerings/new`} />}
                            type="button"
                            className="bg-[var(--primary)] text-[var(--primary-foreground)] hover:brightness-95"
                            onClick={(event) => {
                              if (confirmLeave()) return;
                              event.preventDefault();
                            }}
                          >
                            <Plus className="size-4" />
                            <span>Buat Offering Pertama</span>
                          </Button>
                        </span>
                      ) : null}
                    </TableCell>
                  </TableRow>
                )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ConfirmAlertDialog
        open={confirmDeleteOpen}
        title="Hapus Academic Period"
        description="Periode akademik akan dihapus permanen jika belum memiliki course offering."
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        isPending={deleteMutation.isPending}
        onClose={() => {
          if (deleteMutation.isPending) return;
          setConfirmDeleteOpen(false);
        }}
        onConfirm={() => {
          if (!periodId) return;
          deleteMutation.mutate(periodId);
        }}
      />

      <div className="sticky bottom-4 z-20">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-lg">
          <div>
            <p className="text-sm font-medium text-[var(--foreground)]">
              {isEditing ? "Simpan data period atau ubah aktivasi dari action bar." : "Simpan period baru lalu aktifkan saat sudah siap."}
            </p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">{persistHint}</p>
          </div>

          <div className="flex items-center gap-2">
            {isEditing ? (
              <Button
                type="button"
                variant="destructive"
                onClick={() => setConfirmDeleteOpen(true)}
                disabled={saveMutation.isPending || deleteMutation.isPending}
                className="border-[var(--danger-soft-border)] bg-[var(--danger-soft-bg)] text-[var(--danger-soft-foreground)] hover:opacity-90"
              >
                <Trash2 className="size-4" />
                <span>Hapus</span>
              </Button>
            ) : null}

            <Button
              type="button"
              variant="outline"
              onClick={() => persistForm()}
              disabled={saveMutation.isPending || deleteMutation.isPending}
              className="border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
            >
              {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              <span>{isEditing ? "Simpan Perubahan" : "Simpan Nonaktif"}</span>
            </Button>

            <Button
              type="button"
              onClick={() => persistForm(activationAction.nextIsActive)}
              disabled={saveMutation.isPending || deleteMutation.isPending}
              className={
                form.is_active
                  ? "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
                  : "bg-[var(--primary)] text-[var(--primary-foreground)] hover:brightness-95"
              }
            >
              {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              <span>{activationAction.label}</span>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
