"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  BookmarkCheck,
  CalendarDays,
  CheckCircle2,
  Loader2,
  Save,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { StatusBadge } from "@/features/admin/components/status-badge";
import {
  createAdminCourseOffering,
  deleteAdminCourseOffering,
  getAdminAcademicPeriods,
  getAdminCourseOfferingById,
  getAdminCourses,
  updateAdminCourseOffering,
  type AdminAcademicPeriod,
  type AdminCourse,
  type AdminCourseOffering,
  type CourseOfferingPayload,
} from "@/features/admin/api/master-api";
import { useUnsavedChangesGuard } from "@/features/admin/hooks/use-unsaved-changes-guard";
import {
  formatCurrency,
  formatDate,
} from "@/features/admin/lib/offering-utils";
import { ApiError } from "@/lib/api/client";

type CourseOfferingFormMode = "create" | "edit";

interface CourseOfferingFormPageProps {
  mode: CourseOfferingFormMode;
  offeringId?: number;
  lockedAcademicPeriodId?: number;
}

interface CourseOfferingFormState {
  course_id: string;
  academic_period_id: string;
  title: string;
  capacity: string;
  price: string;
  discount_price: string;
  is_active: boolean;
}

type CourseOfferingFormErrors = Partial<Record<keyof CourseOfferingFormState | "form", string>>;

const defaultForm: CourseOfferingFormState = {
  course_id: "",
  academic_period_id: "",
  title: "",
  capacity: "",
  price: "",
  discount_price: "",
  is_active: false,
};

function mapOfferingToFormState(offering: AdminCourseOffering): CourseOfferingFormState {
  return {
    course_id: offering.course_id ? String(offering.course_id) : "",
    academic_period_id: offering.academic_period_id ? String(offering.academic_period_id) : "",
    title: offering.title ?? "",
    capacity: offering.capacity !== null && offering.capacity !== undefined ? String(offering.capacity) : "",
    price: offering.price !== null && offering.price !== undefined ? String(offering.price) : "",
    discount_price:
      offering.discount_price !== null && offering.discount_price !== undefined ? String(offering.discount_price) : "",
    is_active: Boolean(offering.is_active),
  };
}

function toPositiveInteger(value: string): number | null {
  const normalized = value.trim();
  if (!normalized) return null;

  const parsed = Number(normalized);
  if (!Number.isInteger(parsed) || parsed < 1) return null;

  return parsed;
}

function toNonNegativeNumber(value: string): number | null {
  const normalized = value.trim();
  if (!normalized) return null;

  const parsed = Number(normalized);
  if (Number.isNaN(parsed) || parsed < 0) return null;

  return parsed;
}

function buildPayload(form: CourseOfferingFormState): CourseOfferingPayload {
  const capacity = toPositiveInteger(form.capacity);
  const price = toNonNegativeNumber(form.price);
  const discountPrice = form.discount_price.trim() ? toNonNegativeNumber(form.discount_price) : null;

  if (capacity === null || price === null) {
    throw new Error("Nilai kapasitas atau harga tidak valid");
  }

  return {
    course_id: Number(form.course_id),
    academic_period_id: Number(form.academic_period_id),
    title: form.title.trim(),
    capacity,
    price,
    discount_price: discountPrice,
    is_active: form.is_active,
  };
}

function validateForm(form: CourseOfferingFormState): CourseOfferingFormErrors {
  const errors: CourseOfferingFormErrors = {};

  if (!form.course_id) errors.course_id = "Course wajib dipilih";
  if (!form.academic_period_id) errors.academic_period_id = "Academic period wajib dipilih";
  if (!form.title.trim()) errors.title = "Judul offering wajib diisi";
  if (!form.capacity.trim()) errors.capacity = "Kapasitas wajib diisi";
  if (!form.price.trim()) errors.price = "Harga wajib diisi";

  const capacity = toPositiveInteger(form.capacity);
  if (form.capacity.trim() && capacity === null) {
    errors.capacity = "Kapasitas harus berupa bilangan bulat minimal 1";
  }

  const price = toNonNegativeNumber(form.price);
  if (form.price.trim() && price === null) {
    errors.price = "Harga harus berupa angka minimal 0";
  }

  const discountPrice = form.discount_price.trim() ? toNonNegativeNumber(form.discount_price) : null;
  if (form.discount_price.trim() && discountPrice === null) {
    errors.discount_price = "Diskon harus berupa angka minimal 0";
  }

  if (price !== null && discountPrice !== null && discountPrice > price) {
    errors.discount_price = "Harga diskon tidak boleh melebihi harga normal";
  }

  return errors;
}

function mapApiError(error: unknown): CourseOfferingFormErrors {
  if (!(error instanceof ApiError)) {
    return {
      form: error instanceof Error ? error.message : "Terjadi kesalahan tak terduga",
    };
  }

  const fieldErrors: CourseOfferingFormErrors = {};
  const knownKeys = new Set<keyof CourseOfferingFormState>(Object.keys(defaultForm) as Array<keyof CourseOfferingFormState>);

  if (error.errors) {
    Object.entries(error.errors).forEach(([key, value]) => {
      const firstMessage = Array.isArray(value) ? String(value[0]) : String(value);
      if (!firstMessage) return;

      if (knownKeys.has(key as keyof CourseOfferingFormState)) {
        fieldErrors[key as keyof CourseOfferingFormState] = firstMessage;
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

function buildCourseLabel(course: AdminCourse): string {
  const secondary = [course.category_name, course.instructor_name].filter(Boolean).join(" | ");
  return secondary ? `${course.title} (${secondary})` : course.title;
}

function buildPeriodLabel(period: AdminAcademicPeriod): string {
  const labelChunks = [period.code?.trim(), period.name?.trim()].filter(Boolean);
  return labelChunks.length > 0 ? labelChunks.join(" - ") : `Periode #${period.id}`;
}

export function CourseOfferingFormPage({ mode, offeringId, lockedAcademicPeriodId }: CourseOfferingFormPageProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEditing = mode === "edit";
  const isAcademicPeriodLocked = typeof lockedAcademicPeriodId === "number" && lockedAcademicPeriodId > 0;
  const [draftForm, setDraftForm] = useState<CourseOfferingFormState | null>(null);
  const [formErrors, setFormErrors] = useState<CourseOfferingFormErrors>({});
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const coursesQuery = useQuery({
    queryKey: ["admin", "courses"],
    queryFn: () => getAdminCourses(),
  });

  const periodsQuery = useQuery({
    queryKey: ["admin", "academic-periods", "options"],
    queryFn: () => getAdminAcademicPeriods(),
  });

  const offeringDetailQuery = useQuery({
    queryKey: ["admin", "course-offerings", offeringId],
    queryFn: () => getAdminCourseOfferingById(offeringId as number),
    enabled: isEditing && Boolean(offeringId),
  });

  const baseForm = useMemo<CourseOfferingFormState>(() => {
    if (isEditing && offeringDetailQuery.data) {
      return mapOfferingToFormState(offeringDetailQuery.data);
    }

    return {
      ...defaultForm,
      academic_period_id: lockedAcademicPeriodId ? String(lockedAcademicPeriodId) : defaultForm.academic_period_id,
    };
  }, [lockedAcademicPeriodId, isEditing, offeringDetailQuery.data]);

  const form = draftForm ?? baseForm;
  const sortedCourses = useMemo(
    () => [...(coursesQuery.data ?? [])].sort((a, b) => a.title.localeCompare(b.title)),
    [coursesQuery.data],
  );
  const sortedPeriods = useMemo(
    () =>
      [...(periodsQuery.data ?? [])].sort((a, b) => {
        const left = a.start_at ? new Date(a.start_at).getTime() : 0;
        const right = b.start_at ? new Date(b.start_at).getTime() : 0;
        return right - left;
      }),
    [periodsQuery.data],
  );

  const selectedCourse = useMemo(
    () => sortedCourses.find((course) => String(course.id) === form.course_id) ?? null,
    [form.course_id, sortedCourses],
  );
  const selectedPeriod = useMemo(
    () => sortedPeriods.find((period) => String(period.id) === form.academic_period_id) ?? null,
    [form.academic_period_id, sortedPeriods],
  );

  const selectedCourseLabel = selectedCourse ? buildCourseLabel(selectedCourse) : undefined;
  const selectedPeriodLabel = selectedPeriod ? buildPeriodLabel(selectedPeriod) : undefined;
  const resolvedPeriodId = offeringDetailQuery.data?.academic_period_id ?? lockedAcademicPeriodId ?? Number(form.academic_period_id);
  const returnHref =
    resolvedPeriodId && Number.isInteger(resolvedPeriodId) && resolvedPeriodId > 0
      ? `/admin/academic-periods/${resolvedPeriodId}`
      : "/admin/academic-periods";
  const returnLabel =
    resolvedPeriodId && Number.isInteger(resolvedPeriodId) && resolvedPeriodId > 0
      ? "Kembali ke Detail Period"
      : "Kembali ke Daftar Periode";
  const enrolledCount = Number(offeringDetailQuery.data?.enrollments_count ?? 0);
  const parsedCapacity = toPositiveInteger(form.capacity) ?? 0;
  const fillRate = parsedCapacity > 0 ? Math.round((enrolledCount / parsedCapacity) * 100) : 0;
  const normalPrice = toNonNegativeNumber(form.price) ?? 0;
  const parsedDiscount = form.discount_price.trim() ? toNonNegativeNumber(form.discount_price) ?? 0 : 0;
  const hasActiveDiscount = parsedDiscount > 0 && parsedDiscount < normalPrice;
  const finalPrice = hasActiveDiscount ? parsedDiscount : normalPrice;
  const hasReferenceError = coursesQuery.isError || periodsQuery.isError;
  const hasLockedPeriodMismatch =
    isAcademicPeriodLocked &&
    isEditing &&
    Boolean(offeringDetailQuery.data) &&
    offeringDetailQuery.data?.academic_period_id !== lockedAcademicPeriodId;
  const hasMissingLockedPeriod =
    isAcademicPeriodLocked && periodsQuery.isSuccess && !selectedPeriod;
  const isDirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(baseForm), [baseForm, form]);
  const { confirmLeave } = useUnsavedChangesGuard(isDirty);

  const setForm = (updater: (prev: CourseOfferingFormState) => CourseOfferingFormState) => {
    setDraftForm((prev) => updater(prev ?? baseForm));
  };

  const saveMutation = useMutation({
    mutationFn: (payload: CourseOfferingPayload) => {
      if (isEditing) {
        return updateAdminCourseOffering(offeringId as number, payload);
      }

      return createAdminCourseOffering(payload);
    },
    onSuccess: (savedOffering) => {
      queryClient.setQueryData(["admin", "course-offerings", savedOffering.id], savedOffering);
      queryClient.invalidateQueries({ queryKey: ["admin", "course-offerings"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "academic-periods"] });
      toast.success(isEditing ? "Course offering berhasil diperbarui" : "Course offering berhasil dibuat");
      setFormErrors({});

      if (!isEditing) {
        const savedPeriodId = savedOffering.academic_period_id ?? lockedAcademicPeriodId;
        router.replace(
          savedPeriodId
            ? `/admin/academic-periods/${savedPeriodId}/offerings/${savedOffering.id}`
            : "/admin/academic-periods",
        );
        router.refresh();
        return;
      }

      setDraftForm(null);
    },
    onError: (error) => {
      const nextErrors = mapApiError(error);
      setFormErrors(nextErrors);
      toast.error(nextErrors.form ?? "Gagal menyimpan course offering");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAdminCourseOffering,
    onSuccess: (message) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "course-offerings"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "academic-periods"] });
      toast.success(message || "Course offering berhasil dihapus");
      router.push(returnHref);
      router.refresh();
    },
    onError: (error) => {
      const nextErrors = mapApiError(error);
      setFormErrors(nextErrors);
      toast.error(nextErrors.form ?? "Gagal menghapus course offering");
    },
  });

  const persistForm = (nextIsActive?: boolean) => {
    const nextForm = nextIsActive === undefined ? form : { ...form, is_active: nextIsActive };
    const validationErrors = validateForm(nextForm);

    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      return;
    }

    if (hasReferenceError) {
      setFormErrors({
        form: "Data referensi course atau academic period gagal dimuat",
      });
      return;
    }

    setFormErrors({});
    saveMutation.mutate(buildPayload(nextForm));
  };

  const handleCourseChange = (value: string) => {
    const nextCourse = sortedCourses.find((course) => String(course.id) === value);

    setForm((prev) => ({
      ...prev,
      course_id: value,
      title: prev.title.trim() ? prev.title : nextCourse?.title ?? prev.title,
    }));
  };

  const handlePeriodChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      academic_period_id: value,
    }));
  };

  if (isEditing && offeringDetailQuery.isLoading) {
    return (
      <section className="space-y-5">
        <AdminPageHeader title="Detail Course Offering" description="Memuat detail course offering..." />
        <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <CardContent className="flex items-center gap-2 p-5 text-sm text-[var(--muted-foreground)]">
            <Loader2 className="size-4 animate-spin" />
            Memuat data course offering...
          </CardContent>
        </Card>
      </section>
    );
  }

  if (isEditing && offeringDetailQuery.isError) {
    return (
      <section className="space-y-5">
        <AdminPageHeader title="Detail Course Offering" description="Data offering tidak dapat dimuat." />
        <Card className="border border-[var(--danger-soft-border)] bg-[var(--danger-soft-bg)] shadow-sm">
          <CardContent className="space-y-3 p-5">
            <p className="text-sm text-[var(--danger-soft-foreground)]">
              {isNotFoundError(offeringDetailQuery.error)
                ? "Course offering tidak ditemukan."
                : "Gagal memuat data course offering."}
            </p>
            <Button type="button" variant="outline" onClick={() => router.push(returnHref)}>
              <ArrowLeft className="size-4" />
              <span>{returnLabel}</span>
            </Button>
          </CardContent>
        </Card>
      </section>
    );
  }

  if (hasLockedPeriodMismatch || hasMissingLockedPeriod) {
    return (
      <section className="space-y-5">
        <AdminPageHeader title="Detail Course Offering" description="Konteks period dan offering tidak sinkron." />
        <Card className="border border-[var(--danger-soft-border)] bg-[var(--danger-soft-bg)] shadow-sm">
          <CardContent className="space-y-3 p-5">
            <p className="text-sm text-[var(--danger-soft-foreground)]">
              {hasLockedPeriodMismatch
                ? "Offering ini tidak berada di academic period yang sedang dibuka."
                : "Academic period untuk offering ini tidak ditemukan."}
            </p>
            <Button type="button" variant="outline" onClick={() => router.push(returnHref)}>
              <ArrowLeft className="size-4" />
              <span>{returnLabel}</span>
            </Button>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <AdminPageHeader
        title={isEditing ? `Detail Course Offering - ${offeringDetailQuery.data?.title ?? "-"}` : "Buat Course Offering"}
        description={
          isEditing
            ? `Periode Akademik ${offeringDetailQuery.data?.academic_period?.code ?? "-"}`
            : isAcademicPeriodLocked
              ? "Offering baru ini otomatis terikat ke academic period induk yang sedang dibuka."
              : "Atur offering course per period akademik yang dipilih."
        }
      />

      <div className="flex justify-end">
        <Button
          render={<Link href={returnHref} />}
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
          <span>{returnLabel}</span>
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
                {enrolledCount} / {parsedCapacity}
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
              <p className="text-xs text-[var(--muted-foreground)]">Aktivasi Offering</p>
              <StatusBadge value={form.is_active ? "Aktif" : "Nonaktif"} />
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                {form.is_active ? "Ditampilkan di katalog jika period dan window valid" : "Disembunyikan dari katalog"}
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
              <p className="text-sm font-semibold text-[var(--foreground)]">
                {formatDate(selectedPeriod?.enrollment_open_at)} - {formatDate(selectedPeriod?.enrollment_close_at)}
              </p>
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
              <p className="text-sm font-semibold text-[var(--foreground)]">
                {formatDate(selectedPeriod?.start_at)} - {formatDate(selectedPeriod?.end_at)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm xl:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-[var(--foreground)]">Informasi Offering</CardTitle>
            <p className="text-xs text-[var(--muted-foreground)]">
              {isAcademicPeriodLocked
                ? "Atur detail offering yang berada di dalam academic period ini."
                : "Atur detail umum untuk batch atau offering ini."}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {formErrors.form ? (
              <div className="flex items-start gap-2 rounded-md border border-[var(--danger-soft-border)] bg-[var(--danger-soft-bg)] px-3 py-2 text-sm text-[var(--danger-soft-foreground)]">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>{formErrors.form}</span>
              </div>
            ) : null}

            {hasReferenceError ? (
              <div className="rounded-md border border-[var(--danger-soft-border)] bg-[var(--danger-soft-bg)] px-3 py-2 text-sm text-[var(--danger-soft-foreground)]">
                Gagal memuat daftar course atau academic period. Refresh halaman sebelum menyimpan offering.
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {isAcademicPeriodLocked ? (
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Academic Period</Label>
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3">
                    <p className="text-sm font-medium text-[var(--foreground)]">{selectedPeriodLabel ?? "-"}</p>
                    <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                      Offering ini dibuat dari detail academic period, jadi period tidak bisa diubah di form ini.
                    </p>
                  </div>
                  {formErrors.academic_period_id ? (
                    <p className="text-xs text-red-600">{formErrors.academic_period_id}</p>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Academic Period</Label>
                  <Select value={form.academic_period_id} onValueChange={(value) => handlePeriodChange(value ?? "")}>
                    <SelectTrigger className="w-full border-[var(--border)] bg-[var(--card)]">
                      <SelectValue>
                        {() => {
                          const label = selectedPeriodLabel ?? "Pilih academic period";
                          return (
                            <span className={selectedPeriodLabel ? undefined : "text-[var(--muted-foreground)]"}>
                              {label}
                            </span>
                          );
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent align="start" className="max-w-[min(32rem,calc(100vw-2rem))]">
                      {sortedPeriods.map((period) => (
                        <SelectItem key={period.id} value={String(period.id)}>
                          {buildPeriodLabel(period)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formErrors.academic_period_id ? (
                    <p className="text-xs text-red-600">{formErrors.academic_period_id}</p>
                  ) : null}
                </div>
              )}

              <div className="space-y-1.5 md:col-span-2">
                <Label>Course (Master)</Label>
                <Select value={form.course_id} onValueChange={(value) => handleCourseChange(value ?? "")}>
                  <SelectTrigger className="w-full border-[var(--border)] bg-[var(--card)]">
                    <SelectValue>
                      {() => {
                        const label = selectedCourseLabel ?? "Pilih course";
                        return (
                          <span className={selectedCourseLabel ? undefined : "text-[var(--muted-foreground)]"}>
                            {label}
                          </span>
                        );
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent align="start" className="max-w-[min(40rem,calc(100vw-2rem))]">
                    {sortedCourses.map((course) => (
                      <SelectItem key={course.id} value={String(course.id)}>
                        {buildCourseLabel(course)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.course_id ? <p className="text-xs text-red-600">{formErrors.course_id}</p> : null}
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="offering-title">Judul Offering</Label>
                <Input
                  id="offering-title"
                  value={form.title}
                  onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="Contoh: Intro Programming - Cohort A 2026"
                  className="border-[var(--border)] bg-[var(--card)]"
                />
                {formErrors.title ? <p className="text-xs text-red-600">{formErrors.title}</p> : null}
              </div>

              <div className="space-y-2 rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] p-4 md:col-span-2">
                <div>
                  <p className="text-sm font-medium text-[var(--foreground)]">Jadwal Mengikuti Academic Period</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Offering ini otomatis memakai window pendaftaran dan window belajar dari period yang dipilih.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-2">
                    <p className="text-xs text-[var(--muted-foreground)]">Window Belajar</p>
                    <p className="mt-1 text-sm font-medium text-[var(--foreground)]">
                      {formatDate(selectedPeriod?.start_at)} - {formatDate(selectedPeriod?.end_at)}
                    </p>
                  </div>

                  <div className="rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-2">
                    <p className="text-xs text-[var(--muted-foreground)]">Window Pendaftaran</p>
                    <p className="mt-1 text-sm font-medium text-[var(--foreground)]">
                      {formatDate(selectedPeriod?.enrollment_open_at)} - {formatDate(selectedPeriod?.enrollment_close_at)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="offering-capacity">Capacity (Kapasitas)</Label>
                <Input
                  id="offering-capacity"
                  type="number"
                  min={1}
                  value={form.capacity}
                  onChange={(event) => setForm((prev) => ({ ...prev, capacity: event.target.value }))}
                  className="border-[var(--border)] bg-[var(--card)]"
                />
                {formErrors.capacity ? <p className="text-xs text-red-600">{formErrors.capacity}</p> : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="offering-price">Price (Harga)</Label>
                <CurrencyInput
                  id="offering-price"
                  value={form.price}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, price: value }))}
                  placeholder="0"
                  className="border-[var(--border)] bg-[var(--card)]"
                />
                {formErrors.price ? <p className="text-xs text-red-600">{formErrors.price}</p> : null}
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="offering-discount">Discount (Diskon)</Label>
                <CurrencyInput
                  id="offering-discount"
                  value={form.discount_price}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, discount_price: value }))}
                  placeholder="0"
                  className="border-[var(--border)] bg-[var(--card)]"
                />
                {formErrors.discount_price ? <p className="text-xs text-red-600">{formErrors.discount_price}</p> : null}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-[var(--foreground)]">Ringkasan Offering</CardTitle>
            <p className="text-xs text-[var(--muted-foreground)]">Snapshot cepat untuk validasi sebelum aktivasi.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-md border border-[var(--border)] bg-[var(--surface-soft)] p-3">
              <p className="text-xs text-[var(--muted-foreground)]">Final Price</p>
              {hasActiveDiscount ? (
                <p className="text-xs text-[var(--muted-foreground)] line-through">{formatCurrency(normalPrice)}</p>
              ) : null}
              <p className="text-lg font-semibold text-[var(--foreground)]">{formatCurrency(finalPrice)}</p>
            </div>

            <div className="rounded-md border border-[var(--border)] bg-[var(--surface-soft)] p-3">
              <p className="text-xs text-[var(--muted-foreground)]">Course Terpilih</p>
              <p className="text-sm font-medium text-[var(--foreground)]">{selectedCourse?.title ?? "-"}</p>
              <p className="text-xs text-[var(--muted-foreground)]">
                {[selectedCourse?.category_name, selectedCourse?.instructor_name].filter(Boolean).join(" | ") || "-"}
              </p>
            </div>

            <div className="rounded-md border border-[var(--border)] bg-[var(--surface-soft)] p-3">
              <p className="text-xs text-[var(--muted-foreground)]">Periode Terpilih</p>
              <p className="text-sm font-medium text-[var(--foreground)]">{selectedPeriod?.name ?? "-"}</p>
              <p className="text-xs text-[var(--muted-foreground)]">{selectedPeriod?.code ?? "-"}</p>
              <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                Window period: {formatDate(selectedPeriod?.enrollment_open_at)} -{" "}
                {formatDate(selectedPeriod?.enrollment_close_at)}
              </p>
            </div>

            <div className="rounded-md border border-[var(--border)] bg-[var(--surface-soft)] p-3">
              <p className="text-xs text-[var(--muted-foreground)]">Kapasitas</p>
              <p className="text-sm font-medium text-[var(--foreground)]">
                {enrolledCount} siswa terdaftar dari {parsedCapacity} seat
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <ConfirmAlertDialog
        open={confirmDeleteOpen}
        title="Hapus Course Offering"
        description="Offering hanya bisa dihapus jika belum direferensikan oleh order atau enrollment."
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        isPending={deleteMutation.isPending}
        onClose={() => {
          if (deleteMutation.isPending) return;
          setConfirmDeleteOpen(false);
        }}
        onConfirm={() => {
          if (!offeringId) return;
          deleteMutation.mutate(offeringId);
        }}
      />

      <div className="sticky bottom-4 z-20">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[var(--border)] bg-[var(--card)] p-3 shadow-lg">
          <p className="text-xs text-[var(--muted-foreground)]">
            {isEditing ? "Perubahan akan memengaruhi batch yang sedang dipilih." : "Lengkapi data lalu simpan offering baru."}
          </p>

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
              disabled={saveMutation.isPending || deleteMutation.isPending || coursesQuery.isLoading || periodsQuery.isLoading}
              className="border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
            >
              {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              <span>{isEditing ? "Simpan Perubahan" : "Simpan Nonaktif"}</span>
            </Button>

            <Button
              type="button"
              onClick={() => persistForm(!form.is_active)}
              disabled={saveMutation.isPending || deleteMutation.isPending || coursesQuery.isLoading || periodsQuery.isLoading}
              className={
                form.is_active
                  ? "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
                  : "bg-[var(--primary)] text-[var(--primary-foreground)] hover:brightness-95"
              }
            >
              {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              <span>{form.is_active ? "Nonaktifkan Offering" : "Aktifkan Offering"}</span>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
