"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  Award,
  BookmarkCheck,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Download,
  GraduationCap,
  Layers3,
  Loader2,
  RefreshCcw,
  Save,
  Search,
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  createAdminCourseOffering,
  createEmptyAdminPaginationMeta,
  deleteAdminCourseOffering,
  getAdminAcademicPeriods,
  getAdminCertificateSettings,
  getAdminCourseCurriculum,
  getAdminCourseOfferingById,
  getAdminCourses,
  generateAdminOfferingEnrollmentCertificate,
  listAdminCourseOfferingAssignmentSubmissions,
  listAdminCourseOfferingEnrollments,
  reviewAdminAssignmentSubmission,
  updateAdminCertificateSettings,
  updateAdminCourseOffering,
  type AdminAcademicPeriod,
  type AdminAssignment,
  type AdminCertificateSetting,
  type AdminCourse,
  type AdminCourseCurriculum,
  type AdminCourseOffering,
  type AdminOfferingEnrollment,
  type CertificateSettingPayload,
  type CourseOfferingPayload,
} from "@/features/admin/api/master-api";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { AdminOfferingForumPanel } from "@/features/admin/components/admin-offering-forum-panel";
import { AdminPagination } from "@/features/admin/components/admin-pagination";
import { StatusBadge } from "@/features/admin/components/status-badge";
import { useUnsavedChangesGuard } from "@/features/admin/hooks/use-unsaved-changes-guard";
import { formatCurrency, formatDate, formatDateTime, toStatusLabel } from "@/features/admin/lib/offering-utils";
import { ApiError } from "@/lib/api/client";

type CourseOfferingFormMode = "create" | "edit";
type CourseOfferingTab = "overview" | "curriculum" | "students" | "forum" | "assignment-review" | "certificates";

interface CourseOfferingFormPageProps {
  mode: CourseOfferingFormMode;
  offeringId?: number;
  lockedAcademicPeriodId?: number;
}

interface CourseOfferingFormState {
  course_id: string;
  academic_period_id: string;
  capacity: string;
  price: string;
  discount_price: string;
  is_active: boolean;
}

interface CertificateSettingFormState {
  organization_name: string;
  certificate_title: string;
  certificate_prefix: string;
  signatory_name: string;
  signatory_title: string;
  signature_image: string;
  background_image: string;
  footer_note: string;
  expires_after_months: string;
}

type CourseOfferingFormErrors = Partial<Record<keyof CourseOfferingFormState | "form", string>>;

const defaultForm: CourseOfferingFormState = {
  course_id: "",
  academic_period_id: "",
  capacity: "",
  price: "",
  discount_price: "",
  is_active: false,
};

const defaultCertificateSettingForm: CertificateSettingFormState = {
  organization_name: "OpenLearning LMS",
  certificate_title: "Certificate of Completion",
  certificate_prefix: "CERT",
  signatory_name: "",
  signatory_title: "",
  signature_image: "",
  background_image: "",
  footer_note: "This certificate is generated automatically by the system.",
  expires_after_months: "",
};

const offeringTabs: Array<{ id: CourseOfferingTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "curriculum", label: "Curriculum" },
  { id: "students", label: "Students" },
  { id: "forum", label: "Forum" },
  { id: "assignment-review", label: "Assignment Review" },
  { id: "certificates", label: "Certificates" },
];

function mapOfferingToFormState(offering: AdminCourseOffering): CourseOfferingFormState {
  return {
    course_id: offering.course_id ? String(offering.course_id) : "",
    academic_period_id: offering.academic_period_id ? String(offering.academic_period_id) : "",
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
    capacity,
    price,
    discount_price: discountPrice,
    is_active: form.is_active,
  };
}

function mapCertificateSettingToForm(setting: AdminCertificateSetting): CertificateSettingFormState {
  return {
    organization_name: setting.organization_name ?? "",
    certificate_title: setting.certificate_title ?? "",
    certificate_prefix: setting.certificate_prefix ?? "",
    signatory_name: setting.signatory_name ?? "",
    signatory_title: setting.signatory_title ?? "",
    signature_image: setting.signature_image ?? "",
    background_image: setting.background_image ?? "",
    footer_note: setting.footer_note ?? "",
    expires_after_months:
      setting.expires_after_months !== null && setting.expires_after_months !== undefined
        ? String(setting.expires_after_months)
        : "",
  };
}

function buildCertificateSettingPayload(form: CertificateSettingFormState): CertificateSettingPayload {
  const expiresAfterMonths = form.expires_after_months.trim()
    ? toPositiveInteger(form.expires_after_months)
    : null;

  if (form.expires_after_months.trim() && expiresAfterMonths === null) {
    throw new Error("Masa berlaku sertifikat harus berupa angka minimal 1 bulan");
  }

  return {
    organization_name: form.organization_name.trim(),
    certificate_title: form.certificate_title.trim(),
    certificate_prefix: form.certificate_prefix.trim(),
    signatory_name: form.signatory_name.trim() || null,
    signatory_title: form.signatory_title.trim() || null,
    signature_image: form.signature_image.trim() || null,
    background_image: form.background_image.trim() || null,
    footer_note: form.footer_note.trim() || null,
    expires_after_months: expiresAfterMonths,
  };
}

function validateForm(form: CourseOfferingFormState): CourseOfferingFormErrors {
  const errors: CourseOfferingFormErrors = {};

  if (!form.course_id) errors.course_id = "Course wajib dipilih";
  if (!form.academic_period_id) errors.academic_period_id = "Academic period wajib dipilih";
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

function buildOfferingTabClass(isActive: boolean): string {
  return [
    "rounded-xl border px-4 py-2 text-sm font-semibold transition-colors",
    isActive
      ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
      : "border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:bg-[var(--surface-soft)]",
  ].join(" ");
}

function formatProgress(progress: number | null | undefined): string {
  return `${Math.max(0, Number(progress ?? 0))}%`;
}

function formatAssignmentRequirementSummary(
  requirement: AdminOfferingEnrollment["assignment_requirement"] | null | undefined,
): string {
  if (!requirement) return "-";

  return `${requirement.approved_assignments}/${requirement.required_assignments}`;
}

function flattenAssignments(curriculum: AdminCourseCurriculum | undefined): AdminAssignment[] {
  if (!curriculum) return [];

  const map = new Map<number, AdminAssignment>();
  curriculum.sections.forEach((section) => {
    (section.assignments ?? []).forEach((assignment) => {
      if (assignment.id) {
        map.set(assignment.id, assignment);
      }
    });
  });

  return Array.from(map.values()).sort((left, right) => {
    const leftTitle = left.title ?? "";
    const rightTitle = right.title ?? "";
    return leftTitle.localeCompare(rightTitle);
  });
}

function formatAssignmentReviewStatus(value?: string | null): string {
  return value ? toStatusLabel(value) : "-";
}

function formatRequirementStatus(
  requirement: AdminOfferingEnrollment["assignment_requirement"] | null | undefined,
): string {
  if (!requirement) return "Belum Ada";
  return requirement.is_satisfied ? "Terpenuhi" : "Belum Terpenuhi";
}

export function CourseOfferingFormPage({ mode, offeringId, lockedAcademicPeriodId }: CourseOfferingFormPageProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEditing = mode === "edit";
  const isAcademicPeriodLocked = typeof lockedAcademicPeriodId === "number" && lockedAcademicPeriodId > 0;
  const [activeTab, setActiveTab] = useState<CourseOfferingTab>("overview");
  const [draftForm, setDraftForm] = useState<CourseOfferingFormState | null>(null);
  const [formErrors, setFormErrors] = useState<CourseOfferingFormErrors>({});
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [studentsSearch, setStudentsSearch] = useState("");
  const [studentsPage, setStudentsPage] = useState(1);
  const [certificateSearch, setCertificateSearch] = useState("");
  const [certificatePage, setCertificatePage] = useState(1);
  const [draftCertificateSettingForm, setDraftCertificateSettingForm] =
    useState<CertificateSettingFormState | null>(null);
  const [reviewSearch, setReviewSearch] = useState("");
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewStatusFilter, setReviewStatusFilter] = useState("all");
  const [reviewAssignmentId, setReviewAssignmentId] = useState("all");
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<number | null>(null);
  const [activeCertificateEnrollmentId, setActiveCertificateEnrollmentId] = useState<number | null>(null);
  const [reviewDraft, setReviewDraft] = useState<{
    submissionId: number | null;
    value: string;
  }>({
    submissionId: null,
    value: "",
  });

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

  const showOperationalTabs = isEditing && Boolean(offeringDetailQuery.data);
  const offeringCourseId = offeringDetailQuery.data?.course_id ?? null;
  const courseMasterHref = offeringCourseId
    ? `/admin/master-data/courses/${offeringCourseId}?step=curriculum`
    : "/admin/master-data/courses";

  const curriculumQuery = useQuery({
    queryKey: ["admin", "courses", offeringCourseId, "curriculum"],
    queryFn: () => getAdminCourseCurriculum(offeringCourseId as number),
    enabled:
      showOperationalTabs &&
      Boolean(offeringCourseId) &&
      (activeTab === "curriculum" || activeTab === "assignment-review"),
  });

  const studentsQuery = useQuery({
    queryKey: ["admin", "course-offerings", offeringId, "students", studentsSearch, studentsPage],
    queryFn: () =>
      listAdminCourseOfferingEnrollments(offeringId as number, {
        search: studentsSearch,
        page: studentsPage,
      }),
    enabled: showOperationalTabs && activeTab === "students" && Boolean(offeringId),
  });

  const certificateRowsQuery = useQuery({
    queryKey: ["admin", "course-offerings", offeringId, "certificates", certificateSearch, certificatePage],
    queryFn: () =>
      listAdminCourseOfferingEnrollments(offeringId as number, {
        search: certificateSearch,
        page: certificatePage,
      }),
    enabled: showOperationalTabs && activeTab === "certificates" && Boolean(offeringId),
  });

  const certificateSettingsQuery = useQuery({
    queryKey: ["admin", "certificate-settings"],
    queryFn: getAdminCertificateSettings,
    enabled: showOperationalTabs && activeTab === "certificates",
  });

  const assignmentSubmissionsQuery = useQuery({
    queryKey: [
      "admin",
      "course-offerings",
      offeringId,
      "assignment-submissions",
      reviewAssignmentId,
      reviewStatusFilter,
      reviewSearch,
      reviewPage,
    ],
    queryFn: () =>
      listAdminCourseOfferingAssignmentSubmissions(offeringId as number, {
        assignment_id: reviewAssignmentId === "all" ? undefined : reviewAssignmentId,
        status: reviewStatusFilter === "all" ? undefined : reviewStatusFilter,
        search: reviewSearch,
        page: reviewPage,
      }),
    enabled: showOperationalTabs && activeTab === "assignment-review" && Boolean(offeringId),
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
  const resolvedPeriodId =
    offeringDetailQuery.data?.academic_period_id ?? lockedAcademicPeriodId ?? Number(form.academic_period_id);
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
  const hasMissingLockedPeriod = isAcademicPeriodLocked && periodsQuery.isSuccess && !selectedPeriod;
  const isDirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(baseForm), [baseForm, form]);
  const { confirmLeave } = useUnsavedChangesGuard(isDirty);

  const curriculumAssignments = useMemo(() => flattenAssignments(curriculumQuery.data), [curriculumQuery.data]);
  const studentRows = studentsQuery.data?.items ?? [];
  const studentMeta = studentsQuery.data?.meta ?? createEmptyAdminPaginationMeta(studentsPage);
  const certificateRows = certificateRowsQuery.data?.items ?? [];
  const certificateMeta = certificateRowsQuery.data?.meta ?? createEmptyAdminPaginationMeta(certificatePage);
  const submissionRows = useMemo(
    () => assignmentSubmissionsQuery.data?.items ?? [],
    [assignmentSubmissionsQuery.data?.items],
  );
  const submissionMeta = assignmentSubmissionsQuery.data?.meta ?? createEmptyAdminPaginationMeta(reviewPage);
  const effectiveSelectedSubmissionId = useMemo(() => {
    if (submissionRows.length === 0) {
      return null;
    }

    const stillExists = submissionRows.some((submission) => submission.id === selectedSubmissionId);
    return stillExists ? selectedSubmissionId : submissionRows[0]?.id ?? null;
  }, [selectedSubmissionId, submissionRows]);
  const selectedSubmission = useMemo(
    () => submissionRows.find((submission) => submission.id === effectiveSelectedSubmissionId) ?? null,
    [effectiveSelectedSubmissionId, submissionRows],
  );
  const reviewNotes =
    reviewDraft.submissionId === effectiveSelectedSubmissionId
      ? reviewDraft.value
      : selectedSubmission?.review_notes ?? "";

  const certificateSettingForm =
    draftCertificateSettingForm ??
    (certificateSettingsQuery.data
      ? mapCertificateSettingToForm(certificateSettingsQuery.data)
      : defaultCertificateSettingForm);

  const setCertificateSettingForm = (
    updater: (prev: CertificateSettingFormState) => CertificateSettingFormState,
  ) => {
    setDraftCertificateSettingForm((prev) => updater(prev ?? certificateSettingForm));
  };

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

  const reviewMutation = useMutation({
    mutationFn: ({
      submissionId,
      status,
      notes,
    }: {
      submissionId: number;
      status: "approved" | "revision_required";
      notes: string;
    }) =>
      reviewAdminAssignmentSubmission(submissionId, {
        status,
        review_notes: notes.trim() ? notes.trim() : null,
      }),
    onSuccess: () => {
      toast.success("Review submission berhasil disimpan");
      queryClient.invalidateQueries({
        queryKey: ["admin", "course-offerings", offeringId, "assignment-submissions"],
      });
      queryClient.invalidateQueries({
        queryKey: ["admin", "course-offerings", offeringId, "students"],
      });
      queryClient.invalidateQueries({
        queryKey: ["admin", "course-offerings", offeringId, "certificates"],
      });
    },
    onError: (error) => {
      const nextErrors = mapApiError(error);
      toast.error(nextErrors.form ?? "Gagal menyimpan review submission");
    },
  });

  const certificateMutation = useMutation({
    mutationFn: (enrollmentId: number) =>
      generateAdminOfferingEnrollmentCertificate(offeringId as number, enrollmentId),
    onMutate: (enrollmentId) => {
      setActiveCertificateEnrollmentId(enrollmentId);
    },
    onSuccess: () => {
      toast.success("Certificate berhasil diproses");
      queryClient.invalidateQueries({
        queryKey: ["admin", "course-offerings", offeringId, "students"],
      });
      queryClient.invalidateQueries({
        queryKey: ["admin", "course-offerings", offeringId, "certificates"],
      });
    },
    onError: (error) => {
      const nextErrors = mapApiError(error);
      toast.error(nextErrors.form ?? "Gagal memproses certificate");
    },
    onSettled: () => {
      setActiveCertificateEnrollmentId(null);
    },
  });

  const certificateSettingsMutation = useMutation({
    mutationFn: (payload: CertificateSettingPayload) => updateAdminCertificateSettings(payload),
    onSuccess: (settings) => {
      queryClient.setQueryData(["admin", "certificate-settings"], settings);
      setDraftCertificateSettingForm(null);
      toast.success("Pengaturan sertifikat berhasil disimpan");
    },
    onError: (error) => {
      const nextErrors = mapApiError(error);
      toast.error(nextErrors.form ?? "Gagal menyimpan pengaturan sertifikat");
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
    setForm((prev) => ({
      ...prev,
      course_id: value,
    }));
  };

  const handlePeriodChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      academic_period_id: value,
    }));
  };

  const handleReviewStatusFilterChange = (value: string) => {
    setReviewStatusFilter(value);
    setReviewPage(1);
  };

  const handleReviewAssignmentFilterChange = (value: string) => {
    setReviewAssignmentId(value);
    setReviewPage(1);
  };

  const handleStudentsSearchChange = (value: string) => {
    setStudentsSearch(value);
    setStudentsPage(1);
  };

  const handleCertificateSearchChange = (value: string) => {
    setCertificateSearch(value);
    setCertificatePage(1);
  };

  const handleReviewSearchChange = (value: string) => {
    setReviewSearch(value);
    setReviewPage(1);
  };

  const resetReviewFilters = () => {
    setReviewAssignmentId("all");
    setReviewStatusFilter("all");
    setReviewSearch("");
    setReviewPage(1);
  };

  const handleGenerateCertificate = (enrollmentId: number) => {
    certificateMutation.mutate(enrollmentId);
  };

  const handleSaveCertificateSettings = () => {
    try {
      certificateSettingsMutation.mutate(buildCertificateSettingPayload(certificateSettingForm));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Pengaturan sertifikat tidak valid");
    }
  };

  const handleSubmitReview = (status: "approved" | "revision_required") => {
    if (!selectedSubmission) {
      return;
    }

    reviewMutation.mutate({
      submissionId: selectedSubmission.id,
      status,
      notes: reviewNotes,
    });
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
        title={isEditing ? `Detail Course Offering - ${offeringDetailQuery.data?.course?.title ?? "-"}` : "Buat Course Offering"}
        description={
          isEditing
            ? "Kelola kapasitas, harga, dan status offering untuk course ini."
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

      {showOperationalTabs ? (
        <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <CardContent className="flex flex-wrap gap-2 p-4">
            {offeringTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={buildOfferingTabClass(activeTab === tab.id)}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "overview" || !showOperationalTabs ? (
        <div className="space-y-4">
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

          <div className="sticky bottom-4 z-20">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[var(--border)] bg-[var(--card)] p-3 shadow-lg">
              <p className="text-xs text-[var(--muted-foreground)]">
                {isEditing
                  ? "Perubahan akan memengaruhi batch yang sedang dipilih."
                  : "Lengkapi data lalu simpan offering baru."}
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
                  disabled={
                    saveMutation.isPending || deleteMutation.isPending || coursesQuery.isLoading || periodsQuery.isLoading
                  }
                  className="border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
                >
                  {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                  <span>{isEditing ? "Simpan Perubahan" : "Simpan Nonaktif"}</span>
                </Button>

                <Button
                  type="button"
                  onClick={() => persistForm(!form.is_active)}
                  disabled={
                    saveMutation.isPending || deleteMutation.isPending || coursesQuery.isLoading || periodsQuery.isLoading
                  }
                  className={
                    form.is_active
                      ? "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
                      : "bg-[var(--primary)] text-[var(--primary-foreground)] hover:brightness-95"
                  }
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-4" />
                  )}
                  <span>{form.is_active ? "Nonaktifkan Offering" : "Aktifkan Offering"}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showOperationalTabs && activeTab === "curriculum" ? (
        <div className="space-y-4">
          <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
            <CardContent className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-[var(--foreground)]">Curriculum Read Only</p>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Struktur lesson, quiz, dan assignment di offering ini mengikuti Course Master.
                </p>
              </div>
              <Button render={<Link href={courseMasterHref} />} type="button" variant="outline">
                <Layers3 className="size-4" />
                <span>Buka Course Master</span>
              </Button>
            </CardContent>
          </Card>

          {curriculumQuery.isLoading ? (
            <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
              <CardContent className="flex items-center gap-2 p-5 text-sm text-[var(--muted-foreground)]">
                <Loader2 className="size-4 animate-spin" />
                Memuat curriculum course master...
              </CardContent>
            </Card>
          ) : curriculumQuery.isError ? (
            <Card className="border border-[var(--danger-soft-border)] bg-[var(--danger-soft-bg)] shadow-sm">
              <CardContent className="p-5 text-sm text-[var(--danger-soft-foreground)]">
                Gagal memuat curriculum course master untuk offering ini.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {(curriculumQuery.data?.sections ?? []).map((section) => (
                <Card key={section.id} className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-3 text-base font-semibold text-[var(--foreground)]">
                      <span>{section.title}</span>
                      <span className="rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-2 py-0.5 text-xs font-medium text-[var(--muted-foreground)]">
                        Section #{section.sort_order}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                          Lessons
                        </p>
                        <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">{section.lessons.length}</p>
                      </div>
                      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                          Quizzes
                        </p>
                        <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">{section.quizzes.length}</p>
                      </div>
                      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                          Assignments
                        </p>
                        <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">
                          {(section.assignments ?? []).length}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                      <div className="space-y-2 rounded-lg border border-[var(--border)] p-4">
                        <p className="text-sm font-semibold text-[var(--foreground)]">Lessons</p>
                        {section.lessons.length === 0 ? (
                          <p className="text-sm text-[var(--muted-foreground)]">Belum ada lesson pada section ini.</p>
                        ) : (
                          <div className="space-y-2">
                            {section.lessons.map((lesson) => (
                              <div
                                key={lesson.id}
                                className="rounded-md border border-[var(--border)] bg-[var(--surface-soft)] p-3"
                              >
                                <p className="text-sm font-medium text-[var(--foreground)]">{lesson.title}</p>
                                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                                  {lesson.type} | Durasi: {lesson.duration} menit
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2 rounded-lg border border-[var(--border)] p-4">
                        <p className="text-sm font-semibold text-[var(--foreground)]">Quizzes</p>
                        {section.quizzes.length === 0 ? (
                          <p className="text-sm text-[var(--muted-foreground)]">Belum ada quiz pada section ini.</p>
                        ) : (
                          <div className="space-y-2">
                            {section.quizzes.map((quiz) => (
                              <div
                                key={quiz.id}
                                className="rounded-md border border-[var(--border)] bg-[var(--surface-soft)] p-3"
                              >
                                <p className="text-sm font-medium text-[var(--foreground)]">{quiz.title}</p>
                                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                                  Passing score: {quiz.passing_score ?? "-"} | Attempt: {quiz.max_attempts ?? "-"}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2 rounded-lg border border-[var(--border)] p-4">
                        <p className="text-sm font-semibold text-[var(--foreground)]">Assignments</p>
                        {(section.assignments ?? []).length === 0 ? (
                          <p className="text-sm text-[var(--muted-foreground)]">Belum ada assignment pada section ini.</p>
                        ) : (
                          <div className="space-y-2">
                            {(section.assignments ?? []).map((assignment) => (
                              <div
                                key={assignment.id}
                                className="rounded-md border border-[var(--border)] bg-[var(--surface-soft)] p-3"
                              >
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-sm font-medium text-[var(--foreground)]">{assignment.title}</p>
                                  <StatusBadge value={assignment.status ? toStatusLabel(assignment.status) : "-"} />
                                </div>
                                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                                  Deadline: {formatDateTime(assignment.due_at)} | Max attempt:{" "}
                                  {assignment.max_attempts ?? "-"}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {showOperationalTabs && activeTab === "students" ? (
        <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <CardHeader className="gap-3 pb-2">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-[var(--foreground)]">
                  <GraduationCap className="size-5" />
                  <span>Students</span>
                </CardTitle>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  Daftar siswa yang benar-benar sudah masuk ke offering ini.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative min-w-[18rem]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
                  <Input
                    value={studentsSearch}
                    onChange={(event) => handleStudentsSearchChange(event.target.value)}
                    placeholder="Cari nama atau email siswa"
                    className="pl-9"
                  />
                </div>
                <Button type="button" variant="outline" onClick={() => studentsQuery.refetch()}>
                  <RefreshCcw className="size-4" />
                  <span>Refresh</span>
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-0 p-0">
            {studentsQuery.isLoading ? (
              <div className="flex items-center gap-2 p-5 text-sm text-[var(--muted-foreground)]">
                <Loader2 className="size-4 animate-spin" />
                Memuat daftar siswa...
              </div>
            ) : studentsQuery.isError ? (
              <div className="p-5 text-sm text-[var(--danger-soft-foreground)]">
                Gagal memuat daftar siswa untuk offering ini.
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Status Enrollment</TableHead>
                      <TableHead>Requirement Assignment</TableHead>
                      <TableHead>Sertifikat</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8 text-center text-sm text-[var(--muted-foreground)]">
                          Belum ada siswa yang terdaftar pada offering ini.
                        </TableCell>
                      </TableRow>
                    ) : (
                      studentRows.map((enrollment) => (
                        <TableRow key={enrollment.id}>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-medium text-[var(--foreground)]">{enrollment.user?.fullname ?? "-"}</p>
                              <p className="text-xs text-[var(--muted-foreground)]">{enrollment.user?.email ?? "-"}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-medium text-[var(--foreground)]">{formatProgress(enrollment.progress)}</p>
                              <p className="text-xs text-[var(--muted-foreground)]">
                                Mulai: {formatDateTime(enrollment.started_at)}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <StatusBadge value={enrollment.status ? toStatusLabel(enrollment.status) : "-"} />
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <StatusBadge value={formatRequirementStatus(enrollment.assignment_requirement)} />
                              <p className="text-xs text-[var(--muted-foreground)]">
                                {formatAssignmentRequirementSummary(enrollment.assignment_requirement)}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <StatusBadge value={enrollment.has_certificate ? "Sudah Ada" : "Belum Ada"} />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                {studentRows.length > 0 ? (
                  <AdminPagination
                    meta={studentMeta}
                    isLoading={studentsQuery.isFetching}
                    onPageChange={(page) => setStudentsPage(page)}
                  />
                ) : null}
              </>
            )}
          </CardContent>
        </Card>
      ) : null}

      {showOperationalTabs && activeTab === "forum" && offeringCourseId ? (
        <AdminOfferingForumPanel
          courseId={offeringCourseId}
          courseTitle={offeringDetailQuery.data?.course?.title ?? "Course"}
        />
      ) : null}

      {showOperationalTabs && activeTab === "certificates" ? (
        <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <CardHeader className="gap-3 pb-2">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-[var(--foreground)]">
                  <Award className="size-5" />
                  <span>Certificates</span>
                </CardTitle>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  Generate, regenerate, dan unduh sertifikat student untuk offering ini.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative min-w-[18rem]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
                  <Input
                    value={certificateSearch}
                    onChange={(event) => handleCertificateSearchChange(event.target.value)}
                    placeholder="Cari nama atau email student"
                    className="pl-9"
                  />
                </div>
                <Button type="button" variant="outline" onClick={() => certificateRowsQuery.refetch()}>
                  <RefreshCcw className="size-4" />
                  <span>Refresh</span>
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-5 p-0">
            <div className="border-y border-[var(--border)] bg-[var(--muted)]/40 p-5">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--foreground)]">Pengaturan Sertifikat</h3>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                    Dipakai untuk sertifikat baru atau saat certificate di-regenerate.
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={handleSaveCertificateSettings}
                  disabled={certificateSettingsMutation.isPending || certificateSettingsQuery.isLoading}
                >
                  {certificateSettingsMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  <span>Simpan Setting</span>
                </Button>
              </div>

              {certificateSettingsQuery.isError ? (
                <p className="text-sm text-[var(--danger-soft-foreground)]">Gagal memuat pengaturan sertifikat.</p>
              ) : (
                <>
                <div className="grid gap-4 lg:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="certificate-organization">Nama Organisasi</Label>
                    <Input
                      id="certificate-organization"
                      value={certificateSettingForm.organization_name}
                      onChange={(event) =>
                        setCertificateSettingForm((prev) => ({ ...prev, organization_name: event.target.value }))
                      }
                      placeholder="OpenLearning LMS"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="certificate-title">Judul Sertifikat</Label>
                    <Input
                      id="certificate-title"
                      value={certificateSettingForm.certificate_title}
                      onChange={(event) =>
                        setCertificateSettingForm((prev) => ({ ...prev, certificate_title: event.target.value }))
                      }
                      placeholder="Certificate of Completion"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="certificate-prefix">Prefix Nomor</Label>
                    <Input
                      id="certificate-prefix"
                      value={certificateSettingForm.certificate_prefix}
                      onChange={(event) =>
                        setCertificateSettingForm((prev) => ({ ...prev, certificate_prefix: event.target.value }))
                      }
                      placeholder="CERT"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="certificate-expiry">Masa Berlaku (bulan)</Label>
                    <Input
                      id="certificate-expiry"
                      value={certificateSettingForm.expires_after_months}
                      onChange={(event) =>
                        setCertificateSettingForm((prev) => ({ ...prev, expires_after_months: event.target.value }))
                      }
                      placeholder="Kosongkan jika tidak expired"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="certificate-signatory-name">Nama Penandatangan</Label>
                    <Input
                      id="certificate-signatory-name"
                      value={certificateSettingForm.signatory_name}
                      onChange={(event) =>
                        setCertificateSettingForm((prev) => ({ ...prev, signatory_name: event.target.value }))
                      }
                      placeholder="Nama pemberi sertifikat"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="certificate-signatory-title">Jabatan Penandatangan</Label>
                    <Input
                      id="certificate-signatory-title"
                      value={certificateSettingForm.signatory_title}
                      onChange={(event) =>
                        setCertificateSettingForm((prev) => ({ ...prev, signatory_title: event.target.value }))
                      }
                      placeholder="Program Director"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="certificate-footer">Footer Note</Label>
                    <Textarea
                      id="certificate-footer"
                      value={certificateSettingForm.footer_note}
                      onChange={(event) =>
                        setCertificateSettingForm((prev) => ({ ...prev, footer_note: event.target.value }))
                      }
                      placeholder="Catatan footer sertifikat"
                      className="min-h-10"
                    />
                  </div>
                </div>
                <div className="mt-4 rounded-md border border-[var(--border)] bg-[var(--surface-soft)] p-3 text-sm text-[var(--muted-foreground)]">
                  Background dan tanda tangan sertifikat diupload dari halaman{" "}
                  <Link href="/admin/certificate-settings" className="font-medium text-[var(--primary)] underline underline-offset-2">
                    Certificate Settings
                  </Link>
                  .
                </div>
                </>
              )}
            </div>

            {certificateRowsQuery.isLoading ? (
              <div className="flex items-center gap-2 p-5 text-sm text-[var(--muted-foreground)]">
                <Loader2 className="size-4 animate-spin" />
                Memuat data certificate...
              </div>
            ) : certificateRowsQuery.isError ? (
              <div className="p-5 text-sm text-[var(--danger-soft-foreground)]">
                Gagal memuat data certificate untuk offering ini.
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Requirement Assignment</TableHead>
                      <TableHead>Status Certificate</TableHead>
                      <TableHead>Nomor Certificate</TableHead>
                      <TableHead>Issued At</TableHead>
                      <TableHead className="w-[14rem]">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {certificateRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-8 text-center text-sm text-[var(--muted-foreground)]">
                          Belum ada student pada offering ini.
                        </TableCell>
                      </TableRow>
                    ) : (
                      certificateRows.map((enrollment) => {
                        const isProcessing =
                          certificateMutation.isPending && activeCertificateEnrollmentId === enrollment.id;
                        const downloadHref = enrollment.certificate
                          ? `/api/admin/course-offerings/${offeringId}/certificates/${enrollment.certificate.id}/download`
                          : null;

                        return (
                          <TableRow key={enrollment.id}>
                            <TableCell>
                              <div className="space-y-1">
                                <p className="font-medium text-[var(--foreground)]">{enrollment.user?.fullname ?? "-"}</p>
                                <p className="text-xs text-[var(--muted-foreground)]">{enrollment.user?.email ?? "-"}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <p className="font-medium text-[var(--foreground)]">{formatProgress(enrollment.progress)}</p>
                                <p className="text-xs text-[var(--muted-foreground)]">
                                  Status: {enrollment.status ? toStatusLabel(enrollment.status) : "-"}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <StatusBadge value={formatRequirementStatus(enrollment.assignment_requirement)} />
                                <p className="text-xs text-[var(--muted-foreground)]">
                                  {formatAssignmentRequirementSummary(enrollment.assignment_requirement)}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <StatusBadge value={enrollment.certificate_status || "Belum Ada"} />
                                {enrollment.certificate_block_reason ? (
                                  <p className="max-w-xs text-xs text-[var(--muted-foreground)]">
                                    {enrollment.certificate_block_reason}
                                  </p>
                                ) : null}
                              </div>
                            </TableCell>
                            <TableCell>{enrollment.certificate?.certificate_number ?? "-"}</TableCell>
                            <TableCell>{formatDateTime(enrollment.certificate?.issued_at)}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-2">
                                {downloadHref ? (
                                  <Button render={<a href={downloadHref} />} type="button" variant="outline" size="sm">
                                    <Download className="size-4" />
                                    <span>Download</span>
                                  </Button>
                                ) : null}
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={enrollment.has_certificate ? "outline" : "default"}
                                  onClick={() => handleGenerateCertificate(enrollment.id)}
                                  disabled={isProcessing || !enrollment.can_generate_certificate}
                                  className={
                                    enrollment.has_certificate
                                      ? "border-[var(--border)]"
                                      : "bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:opacity-90"
                                  }
                                >
                                  {isProcessing ? <Loader2 className="size-4 animate-spin" /> : <BookmarkCheck className="size-4" />}
                                  <span>{enrollment.has_certificate ? "Regenerate" : "Generate"}</span>
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>

                {certificateRows.length > 0 ? (
                  <AdminPagination
                    meta={certificateMeta}
                    isLoading={certificateRowsQuery.isFetching}
                    onPageChange={(page) => setCertificatePage(page)}
                  />
                ) : null}
              </>
            )}
          </CardContent>
        </Card>
      ) : null}

      {showOperationalTabs && activeTab === "assignment-review" ? (
        <div className="space-y-4">
          <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
            <CardHeader className="gap-3 pb-2">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base font-semibold text-[var(--foreground)]">
                    <ClipboardList className="size-5" />
                    <span>Assignment Review</span>
                  </CardTitle>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                    Review submission assignment hanya untuk student di offering ini.
                  </p>
                </div>

                <Button render={<Link href={courseMasterHref} />} type="button" variant="outline">
                  <Layers3 className="size-4" />
                  <span>Lihat Course Master</span>
                </Button>
              </div>
            </CardHeader>

            <CardContent className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_16rem_10rem_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
                <Input
                  value={reviewSearch}
                  onChange={(event) => handleReviewSearchChange(event.target.value)}
                  placeholder="Cari student, assignment, atau isi submission"
                  className="pl-9"
                />
              </div>

              <Select value={reviewAssignmentId} onValueChange={(value) => handleReviewAssignmentFilterChange(value ?? "all")}>
                <SelectTrigger className="w-full min-w-[12rem]">
                  <SelectValue>
                    {() => (
                      <span>
                        {reviewAssignmentId === "all"
                          ? "Semua assignment"
                          : curriculumAssignments.find((assignment) => String(assignment.id) === reviewAssignmentId)?.title ??
                            "Semua assignment"}
                      </span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua assignment</SelectItem>
                  {curriculumAssignments.map((assignment) => (
                    <SelectItem key={assignment.id} value={String(assignment.id)}>
                      {assignment.title ?? `Assignment #${assignment.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={reviewStatusFilter} onValueChange={(value) => handleReviewStatusFilterChange(value ?? "all")}>
                <SelectTrigger className="w-full min-w-[12rem]">
                  <SelectValue>
                    {() => (
                      <span>
                        {reviewStatusFilter === "all"
                          ? "Semua status"
                          : reviewStatusFilter === "submitted"
                            ? "Submitted"
                            : reviewStatusFilter === "revision_required"
                              ? "Revision Required"
                              : "Approved"}
                      </span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua status</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="revision_required">Revision Required</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                </SelectContent>
              </Select>

              <Button type="button" variant="outline" onClick={resetReviewFilters}>
                Reset
              </Button>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-[var(--foreground)]">Daftar Submission</CardTitle>
              </CardHeader>
              <CardContent className="space-y-0 p-0">
                {assignmentSubmissionsQuery.isLoading ? (
                  <div className="flex items-center gap-2 p-5 text-sm text-[var(--muted-foreground)]">
                    <Loader2 className="size-4 animate-spin" />
                    Memuat submission assignment...
                  </div>
                ) : assignmentSubmissionsQuery.isError ? (
                  <div className="p-5 text-sm text-[var(--danger-soft-foreground)]">
                    Gagal memuat daftar submission assignment.
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead>Assignment</TableHead>
                          <TableHead>Attempt</TableHead>
                          <TableHead>Submitted At</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Reviewer</TableHead>
                          <TableHead className="w-[7rem]">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {submissionRows.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="py-8 text-center text-sm text-[var(--muted-foreground)]">
                              Belum ada submission untuk filter yang dipilih.
                            </TableCell>
                          </TableRow>
                        ) : (
                          submissionRows.map((submission) => (
                            <TableRow
                              key={submission.id}
                              className={submission.id === selectedSubmissionId ? "bg-[var(--surface-soft)]" : undefined}
                            >
                              <TableCell>
                                <div className="space-y-1">
                                  <p className="font-medium text-[var(--foreground)]">{submission.user?.fullname ?? "-"}</p>
                                  <p className="text-xs text-[var(--muted-foreground)]">{submission.user?.email ?? "-"}</p>
                                </div>
                              </TableCell>
                              <TableCell>{submission.assignment?.title ?? "-"}</TableCell>
                              <TableCell>Attempt #{submission.attempt_no ?? "-"}</TableCell>
                              <TableCell>{formatDateTime(submission.submitted_at)}</TableCell>
                              <TableCell>
                                <StatusBadge value={formatAssignmentReviewStatus(submission.status)} />
                              </TableCell>
                              <TableCell>{submission.reviewer_name ?? "-"}</TableCell>
                              <TableCell>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedSubmissionId(submission.id)}
                                >
                                  Pilih
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>

                    {submissionRows.length > 0 ? (
                      <AdminPagination
                        meta={submissionMeta}
                        isLoading={assignmentSubmissionsQuery.isFetching}
                        onPageChange={(page) => setReviewPage(page)}
                      />
                    ) : null}
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-[var(--foreground)]">Panel Review</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!selectedSubmission ? (
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] p-4 text-sm text-[var(--muted-foreground)]">
                    Pilih submission dari daftar di kiri untuk melihat detail dan memberi review.
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] p-3">
                        <p className="text-xs text-[var(--muted-foreground)]">Student</p>
                        <p className="mt-1 font-medium text-[var(--foreground)]">{selectedSubmission.user?.fullname ?? "-"}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">{selectedSubmission.user?.email ?? "-"}</p>
                      </div>

                      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] p-3">
                        <p className="text-xs text-[var(--muted-foreground)]">Assignment</p>
                        <p className="mt-1 font-medium text-[var(--foreground)]">
                          {selectedSubmission.assignment?.title ?? "-"}
                        </p>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          Section: {selectedSubmission.assignment?.section_title ?? "-"}
                        </p>
                      </div>

                      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] p-3">
                        <p className="text-xs text-[var(--muted-foreground)]">Status Submission</p>
                        <div className="mt-1">
                          <StatusBadge value={formatAssignmentReviewStatus(selectedSubmission.status)} />
                        </div>
                        <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                          Attempt #{selectedSubmission.attempt_no ?? "-"} | Submitted{" "}
                          {formatDateTime(selectedSubmission.submitted_at)}
                        </p>
                      </div>

                      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] p-3">
                        <p className="text-xs text-[var(--muted-foreground)]">Enrollment Snapshot</p>
                        <p className="mt-1 font-medium text-[var(--foreground)]">
                          Progress {formatProgress(selectedSubmission.enrollment?.progress)}
                        </p>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          Status: {selectedSubmission.enrollment?.status ? toStatusLabel(selectedSubmission.enrollment.status) : "-"}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 rounded-lg border border-[var(--border)] p-4">
                      <p className="text-sm font-semibold text-[var(--foreground)]">Isi Submission</p>
                      <div className="rounded-md border border-[var(--border)] bg-[var(--surface-soft)] p-3 text-sm text-[var(--foreground)]">
                        {selectedSubmission.submission_text?.trim() ? selectedSubmission.submission_text : "Tidak ada submission text."}
                      </div>
                      <div className="text-sm">
                        <span className="font-medium text-[var(--foreground)]">Attachment:</span>{" "}
                        {selectedSubmission.attachment_url ? (
                          <a
                            href={selectedSubmission.attachment_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[var(--primary)] underline-offset-2 hover:underline"
                          >
                            Buka lampiran
                          </a>
                        ) : (
                          <span className="text-[var(--muted-foreground)]">Tidak ada lampiran.</span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="review-notes">Catatan Review</Label>
                      <Textarea
                        id="review-notes"
                        value={reviewNotes}
                        onChange={(event) =>
                          setReviewDraft({
                            submissionId: effectiveSelectedSubmissionId,
                            value: event.target.value,
                          })
                        }
                        placeholder="Tulis feedback singkat untuk student..."
                        className="min-h-28 border-[var(--border)] bg-[var(--card)]"
                      />
                      {selectedSubmission.review_notes ? (
                        <p className="text-xs text-[var(--muted-foreground)]">
                          Catatan sebelumnya: {selectedSubmission.review_notes}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        onClick={() => handleSubmitReview("approved")}
                        disabled={reviewMutation.isPending || selectedSubmission.status === "approved"}
                        className="bg-emerald-600 text-white hover:bg-emerald-700"
                      >
                        {reviewMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                        <span>Approve</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleSubmitReview("revision_required")}
                        disabled={reviewMutation.isPending}
                        className="border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
                      >
                        {reviewMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                        <span>Perlu Revisi</span>
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}

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
    </section>
  );
}
