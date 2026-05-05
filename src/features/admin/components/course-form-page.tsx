"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Sortable, { type SortableEvent } from "sortablejs";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  GripVertical,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import {
  createAdminCourseSectionQuiz,
  createAdminCourse,
  createAdminSection,
  deleteAdminQuiz,
  deleteAdminLesson,
  getAdminCategories,
  getAdminCourseCurriculum,
  getAdminCourseQuizzes,
  getAdminUsers,
  upsertAdminCourseCurriculum,
  updateAdminCourseSectionQuiz,
  type AdminQuiz,
  type AdminCourseCurriculum,
  type CoursePayload,
  type CourseCurriculumSectionPayload,
} from "@/features/admin/api/master-api";
import { useUnsavedChangesGuard } from "@/features/admin/hooks/use-unsaved-changes-guard";
import { AdminModal } from "@/features/admin/components/admin-modal";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type CourseFormMode = "create" | "edit";
type LessonType = "video" | "file";

interface AdminCourseFormPageProps {
  mode: CourseFormMode;
  courseId?: number;
}

interface LessonFormState {
  client_id: string;
  id?: number;
  title: string;
  description: string;
  type: LessonType;
  lesson_url: string;
  duration: string;
  is_preview: boolean;
}

interface SectionFormState {
  client_id: string;
  id?: number;
  title: string;
  lessons: LessonFormState[];
}

interface CourseFormState {
  title: string;
  category_id: string;
  instructor_id: string;
  price: string;
  discount_price: string;
  status: "draft" | "published" | "archived";
  description: string;
  requirements: string;
  outcomes: string;
  sections: SectionFormState[];
}

interface QuizFormState {
  section_id: string;
  title: string;
  description: string;
  duration: string;
  passing_score: string;
  weight: string;
  max_attempts: string;
  is_active: boolean;
  is_random: boolean;
}

type CourseFormErrors = Record<string, string>;
type CourseWizardStep = "general" | "curriculum" | "settings" | "publish";
type CourseSaveIntent = "draft" | "publish";

interface SectionDeleteTarget {
  sectionIndex: number;
  sectionTitle: string;
}

interface LessonDeleteTarget {
  sectionIndex: number;
  lessonIndex: number;
  lessonId?: number;
  lessonTitle: string;
}

interface CourseWizardStepItem {
  key: CourseWizardStep;
  label: string;
  description: string;
}

const FORM_ERROR_KEY = "__form";
const AUTOSAVE_DELAY_MS = 15000;

const DEFAULT_FORM: CourseFormState = {
  title: "",
  category_id: "",
  instructor_id: "",
  price: "",
  discount_price: "",
  status: "draft",
  description: "",
  requirements: "",
  outcomes: "",
  sections: [],
};

const DEFAULT_QUIZ_FORM: QuizFormState = {
  section_id: "",
  title: "",
  description: "",
  duration: "",
  passing_score: "",
  weight: "",
  max_attempts: "",
  is_active: true,
  is_random: false,
};

const COURSE_WIZARD_STEPS: CourseWizardStepItem[] = [
  {
    key: "general",
    label: "General Info",
    description: "Judul, kategori, instructor, dan deskripsi utama.",
  },
  {
    key: "curriculum",
    label: "Curriculum",
    description: "Atur section, lesson, dan quiz per section.",
  },
  {
    key: "settings",
    label: "Settings",
    description: "Harga dan diskon course.",
  },
  {
    key: "publish",
    label: "Publish",
    description: "Review ringkasan, lalu pilih simpan draft atau publish.",
  },
];

const courseMetadataKeys: Array<Exclude<keyof CourseFormState, "sections">> = [
  "title",
  "category_id",
  "instructor_id",
  "price",
  "discount_price",
  "status",
  "description",
  "requirements",
  "outcomes",
];

const lessonSchema = z
  .object({
    title: z.string().trim().min(1, "Judul lesson wajib diisi"),
    description: z.string(),
    type: z.enum(["video", "file"]),
    lesson_url: z.string(),
    duration: z
      .string()
      .trim()
      .refine((value) => value === "" || (!Number.isNaN(Number(value)) && Number(value) >= 0), {
        message: "Durasi lesson harus berupa angka positif",
      }),
    is_preview: z.boolean(),
  })
  .superRefine((lesson, context) => {
    if (!lesson.lesson_url.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lesson_url"],
        message: "URL wajib diisi untuk lesson video/file",
      });
    }
  });

const sectionSchema = z.object({
  title: z.string().trim().min(1, "Judul section wajib diisi"),
  lessons: z.array(lessonSchema),
});

const courseFormSchema = z
  .object({
    title: z.string().trim().min(1, "Judul course wajib diisi"),
    category_id: z.string().trim().min(1, "Kategori wajib dipilih"),
    instructor_id: z.string().trim().min(1, "Instructor wajib dipilih"),
    price: z
      .string()
      .trim()
      .min(1, "Harga wajib diisi")
      .refine((value) => !Number.isNaN(Number(value)) && Number(value) >= 0, {
        message: "Harga harus berupa angka positif",
      }),
    discount_price: z
      .string()
      .trim()
      .refine((value) => value === "" || (!Number.isNaN(Number(value)) && Number(value) >= 0), {
        message: "Harga diskon harus berupa angka positif",
      }),
    status: z.enum(["draft", "published", "archived"]),
    description: z.string(),
    requirements: z.string(),
    outcomes: z.string(),
    sections: z.array(sectionSchema),
  })
  .superRefine((course, context) => {
    if (!course.discount_price.trim()) return;

    if (Number(course.discount_price) > Number(course.price)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["discount_price"],
        message: "Harga diskon tidak boleh lebih besar dari harga utama",
      });
    }
  });

function createClientId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isValidCourseId(courseId?: number): courseId is number {
  return typeof courseId === "number" && Number.isInteger(courseId) && courseId > 0;
}

function createEmptySection(): SectionFormState {
  return {
    client_id: createClientId("section"),
    title: "",
    lessons: [],
  };
}

function mapCurriculumToFormState(curriculum: AdminCourseCurriculum): CourseFormState {
  return {
    title: curriculum.title,
    category_id: String(curriculum.category_id),
    instructor_id: String(curriculum.instructor_id),
    price: String(curriculum.price),
    discount_price: curriculum.discount_price ? String(curriculum.discount_price) : "",
    status: curriculum.status,
    description: curriculum.description ?? "",
    requirements: curriculum.requirements ?? "",
    outcomes: curriculum.outcomes ?? "",
    sections: curriculum.sections.map((section) => ({
      client_id: createClientId("section"),
      id: section.id,
      title: section.title,
      lessons: section.lessons.map((lesson) => ({
        client_id: createClientId("lesson"),
        id: lesson.id,
        title: lesson.title,
        description: lesson.description ?? "",
        type: lesson.type,
        lesson_url: lesson.lesson_url ?? "",
        duration: String(lesson.duration ?? 0),
        is_preview: Boolean(lesson.is_preview),
      })),
    })),
  };
}

function buildCoursePayload(form: CourseFormState, status: CourseFormState["status"]): CoursePayload {
  const parsedPrice = Number(form.price);
  const safePrice = Number.isNaN(parsedPrice) || parsedPrice < 0 ? 0 : parsedPrice;
  const parsedDiscount = form.discount_price.trim() ? Number(form.discount_price) : 0;
  const safeDiscount = Number.isNaN(parsedDiscount) || parsedDiscount < 0 ? 0 : parsedDiscount;

  return {
    title: form.title.trim(),
    description: form.description.trim() || null,
    category_id: Number(form.category_id),
    instructor_id: Number(form.instructor_id),
    price: safePrice,
    discount_price: safeDiscount > safePrice ? safePrice : safeDiscount,
    status,
    requirements: form.requirements.trim() || null,
    outcomes: form.outcomes.trim() || null,
  };
}

function parsePositiveInteger(raw: string): number | null {
  const normalized = raw.trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function parseNonNegativeNumber(raw: string): number | null {
  const normalized = raw.trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (Number.isNaN(parsed) || parsed < 0) return null;
  return parsed;
}

function buildDraftCoursePayload(form: CourseFormState): Partial<CoursePayload> {
  const payload: Partial<CoursePayload> = {
    status: "draft",
    description: form.description.trim() || null,
    requirements: form.requirements.trim() || null,
    outcomes: form.outcomes.trim() || null,
  };

  const title = form.title.trim();
  if (title) {
    payload.title = title;
  }

  const categoryId = parsePositiveInteger(form.category_id);
  if (categoryId !== null) {
    payload.category_id = categoryId;
  }

  const instructorId = parsePositiveInteger(form.instructor_id);
  if (instructorId !== null) {
    payload.instructor_id = instructorId;
  }

  const price = parseNonNegativeNumber(form.price);
  if (price !== null) {
    payload.price = price;
  }

  const discount = parseNonNegativeNumber(form.discount_price);
  if (discount !== null && (price === null || discount <= price)) {
    payload.discount_price = discount;
  } else if (!form.discount_price.trim()) {
    payload.discount_price = 0;
  }

  return payload;
}

function buildCurriculumPayloadSections(form: CourseFormState): CourseCurriculumSectionPayload[] {
  return form.sections.map((section, sectionIndex) => ({
    id: section.id,
    title: section.title.trim(),
    sort_order: sectionIndex + 1,
    lessons: section.lessons.map((lesson, lessonIndex) => ({
      id: lesson.id,
      title: lesson.title.trim(),
      description: lesson.description.trim() || null,
      type: lesson.type,
      lesson_url: lesson.lesson_url.trim() || null,
      duration: lesson.duration.trim() ? Number(lesson.duration) : 0,
      sort_order: lessonIndex + 1,
      is_preview: lesson.is_preview,
    })),
  }));
}

function toNonNegativeNumberOrZero(raw: string): number {
  if (!raw.trim()) return 0;
  const parsed = Number(raw);
  if (Number.isNaN(parsed) || parsed < 0) return 0;
  return parsed;
}

function isInvalidOptionalNumber(value: string): boolean {
  if (!value.trim()) return false;
  const parsed = Number(value);
  return Number.isNaN(parsed) || parsed < 0;
}

function mapSchemaErrors(error: z.ZodError): CourseFormErrors {
  const mappedErrors: CourseFormErrors = {};

  error.issues.forEach((issue) => {
    const path = issue.path.join(".");
    if (!path) {
      if (!mappedErrors[FORM_ERROR_KEY]) {
        mappedErrors[FORM_ERROR_KEY] = issue.message;
      }
      return;
    }

    if (!mappedErrors[path]) {
      mappedErrors[path] = issue.message;
    }
  });

  return mappedErrors;
}

function mapApiError(error: unknown): CourseFormErrors {
  if (!(error instanceof ApiError)) {
    return {
      [FORM_ERROR_KEY]: error instanceof Error ? error.message : "Terjadi kesalahan tak terduga",
    };
  }

  const mappedErrors: CourseFormErrors = {};
  if (error.errors) {
    Object.entries(error.errors).forEach(([key, value]) => {
      const firstMessage = Array.isArray(value) ? String(value[0]) : String(value);
      if (firstMessage) {
        mappedErrors[key] = firstMessage;
      }
    });
  }

  if (!mappedErrors[FORM_ERROR_KEY]) {
    mappedErrors[FORM_ERROR_KEY] = error.message;
  }

  return mappedErrors;
}

function normalizeError(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Terjadi kesalahan tak terduga";
}

function getSectionDisplayLabel(section: Pick<SectionFormState, "title">, fallbackIndex?: number): string {
  const title = section.title.trim();
  if (title) return title;
  if (typeof fallbackIndex === "number") return `Section ${fallbackIndex + 1}`;
  return "Section tanpa judul";
}

function getStepIndexFromParam(stepParam: string | null): number {
  if (stepParam === "curriculum") return 1;
  if (stepParam === "settings") return 2;
  if (stepParam === "publish") return 3;
  return 0;
}

function isCourseFormDirty(currentForm: CourseFormState, baseForm: CourseFormState): boolean {
  if (courseMetadataKeys.some((key) => currentForm[key] !== baseForm[key])) {
    return true;
  }

  if (currentForm.sections.length !== baseForm.sections.length) {
    return true;
  }

  for (let sectionIndex = 0; sectionIndex < currentForm.sections.length; sectionIndex += 1) {
    const currentSection = currentForm.sections[sectionIndex];
    const baseSection = baseForm.sections[sectionIndex];

    if (!baseSection) return true;
    if ((currentSection.id ?? null) !== (baseSection.id ?? null)) return true;
    if (currentSection.title !== baseSection.title) return true;
    if (currentSection.lessons.length !== baseSection.lessons.length) return true;

    for (let lessonIndex = 0; lessonIndex < currentSection.lessons.length; lessonIndex += 1) {
      const currentLesson = currentSection.lessons[lessonIndex];
      const baseLesson = baseSection.lessons[lessonIndex];

      if (!baseLesson) return true;

      if ((currentLesson.id ?? null) !== (baseLesson.id ?? null)) return true;
      if (currentLesson.title !== baseLesson.title) return true;
      if (currentLesson.description !== baseLesson.description) return true;
      if (currentLesson.type !== baseLesson.type) return true;
      if (currentLesson.lesson_url !== baseLesson.lesson_url) return true;
      if (currentLesson.duration !== baseLesson.duration) return true;
      if (currentLesson.is_preview !== baseLesson.is_preview) return true;
    }
  }

  return false;
}

export function AdminCourseFormPage({ mode, courseId }: AdminCourseFormPageProps) {
  // SECTION 1: Basic state and flags.
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const isEditing = mode === "edit";
  const validCourseId = isValidCourseId(courseId) ? courseId : null;
  const [draftForm, setDraftForm] = useState<CourseFormState | null>(null);
  const [formErrors, setFormErrors] = useState<CourseFormErrors>({});
  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [editingSectionIndex, setEditingSectionIndex] = useState<number | null>(null);
  const [sectionTitleInput, setSectionTitleInput] = useState("");
  const [quizModalOpen, setQuizModalOpen] = useState(false);
  const [editingQuizId, setEditingQuizId] = useState<number | null>(null);
  const [quizForm, setQuizForm] = useState<QuizFormState>(DEFAULT_QUIZ_FORM);
  const [confirmDeleteQuiz, setConfirmDeleteQuiz] = useState<AdminQuiz | null>(null);
  const [confirmDeleteSection, setConfirmDeleteSection] = useState<SectionDeleteTarget | null>(null);
  const [confirmDeleteLesson, setConfirmDeleteLesson] = useState<LessonDeleteTarget | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(() =>
    getStepIndexFromParam(searchParams.get("step")),
  );
  const [lastAutosavedAt, setLastAutosavedAt] = useState<Date | null>(null);
  const [autosaveErrorMessage, setAutosaveErrorMessage] = useState<string | null>(null);
  const sectionListRef = useRef<HTMLDivElement | null>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAutosavedFingerprintRef = useRef<string>("");

  // SECTION 2: Reference data and curriculum detail.
  const categoryQuery = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: getAdminCategories,
  });

  const userQuery = useQuery({
    queryKey: ["admin", "users"],
    queryFn: getAdminUsers,
  });

  const curriculumQuery = useQuery({
    queryKey: ["admin", "courses", "curriculum", validCourseId],
    queryFn: () => {
      if (validCourseId === null) {
        throw new Error("ID course tidak valid");
      }
      return getAdminCourseCurriculum(validCourseId);
    },
    enabled: isEditing && validCourseId !== null,
  });

  const courseQuizzesQuery = useQuery({
    queryKey: ["admin", "courses", "quizzes", validCourseId],
    queryFn: () => {
      if (validCourseId === null) {
        throw new Error("ID course tidak valid");
      }
      return getAdminCourseQuizzes(validCourseId);
    },
    enabled: isEditing && validCourseId !== null,
  });

  // SECTION 3: Base form source and updater helpers.
  const baseForm = useMemo<CourseFormState>(() => {
    if (isEditing && curriculumQuery.data) {
      return mapCurriculumToFormState(curriculumQuery.data);
    }
    return DEFAULT_FORM;
  }, [curriculumQuery.data, isEditing]);

  const form = draftForm ?? baseForm;
  const autosaveFingerprint = useMemo(() => JSON.stringify(form), [form]);
  const categoryLabelMap = useMemo(() => {
    return new Map((categoryQuery.data ?? []).map((category) => [String(category.id), category.name]));
  }, [categoryQuery.data]);
  const instructorLabelMap = useMemo(() => {
    return new Map(
      (userQuery.data ?? []).map((user) => [String(user.id), `${user.fullname} (${user.email})`]),
    );
  }, [userQuery.data]);
  const selectedCategoryLabel = form.category_id ? categoryLabelMap.get(form.category_id) : undefined;
  const selectedInstructorLabel = form.instructor_id
    ? instructorLabelMap.get(form.instructor_id)
    : undefined;
  const selectedQuizSectionLabel = useMemo(() => {
    if (!quizForm.section_id) return undefined;

    const sectionIndex = form.sections.findIndex((section) => String(section.id ?? "") === quizForm.section_id);
    if (sectionIndex < 0) return "Section tidak ditemukan";

    return getSectionDisplayLabel(form.sections[sectionIndex], sectionIndex);
  }, [form.sections, quizForm.section_id]);
  const totalLessons = useMemo(() => {
    return form.sections.reduce((total, section) => total + section.lessons.length, 0);
  }, [form.sections]);
  const curriculumReturnTo = useMemo(() => {
    if (validCourseId === null) return "/admin/master-data/courses";
    return `/admin/master-data/courses/${validCourseId}?step=curriculum`;
  }, [validCourseId]);

  const quizzesBySectionId = useMemo(() => {
    return (courseQuizzesQuery.data ?? []).reduce<Map<number, AdminQuiz[]>>((acc, quiz) => {
      const current = acc.get(quiz.section_id) ?? [];
      current.push(quiz);
      acc.set(quiz.section_id, current);
      return acc;
    }, new Map());
  }, [courseQuizzesQuery.data]);

  const updateForm = useCallback(
    (updater: (prev: CourseFormState) => CourseFormState, shouldClearErrors = false) => {
      setDraftForm((prev) => updater(prev ?? baseForm));
      if (shouldClearErrors) {
        setFormErrors({});
      }
    },
    [baseForm],
  );

  const updateField = useCallback(
    <K extends Exclude<keyof CourseFormState, "sections">>(key: K, value: CourseFormState[K]) => {
      updateForm(
        (prev) => ({
          ...prev,
          [key]: value,
        }),
      );

      const fieldKey = key as string;
      setFormErrors((prev) => {
        if (!prev[fieldKey] && !prev[FORM_ERROR_KEY]) return prev;
        const next = { ...prev };
        delete next[fieldKey];
        delete next[FORM_ERROR_KEY];
        return next;
      });
    },
    [updateForm],
  );

  const addSectionLocally = (title: string) => {
    const normalizedTitle = title.trim();
    if (!normalizedTitle) return;

    updateForm(
      (prev) => ({
        ...prev,
        sections: [
          ...prev.sections,
          {
            ...createEmptySection(),
            title: normalizedTitle,
          },
        ],
      }),
      true,
    );
  };

  const removeSection = (sectionIndex: number) => {
    updateForm(
      (prev) => ({
        ...prev,
        sections: prev.sections.filter((_, index) => index !== sectionIndex),
      }),
      true,
    );
  };

  const removeLesson = (sectionIndex: number, lessonIndex: number) => {
    updateForm(
      (prev) => ({
        ...prev,
        sections: prev.sections.map((section, index) =>
          index === sectionIndex
            ? {
                ...section,
                lessons: section.lessons.filter((_, idx) => idx !== lessonIndex),
              }
            : section,
        ),
      }),
      true,
    );
  };

  // SECTION 4: Unsaved changes guard.
  const isDirty = useMemo(() => isCourseFormDirty(form, baseForm), [baseForm, form]);
  const canManageQuizzes = isEditing && validCourseId !== null;
  const { confirmLeave } = useUnsavedChangesGuard(isDirty);

  // SECTION 5: Save mutation.
  const saveMutation = useMutation({
    mutationFn: async ({
      submittedForm,
      intent,
      includeSections,
    }: {
      submittedForm: CourseFormState;
      intent: CourseSaveIntent;
      includeSections: boolean;
    }) => {
      const shouldPublish = intent === "publish";
      const publishStatus: CourseFormState["status"] = shouldPublish ? "published" : "draft";
      const curriculumSectionsPayload = includeSections ? buildCurriculumPayloadSections(submittedForm) : undefined;

      if (isEditing) {
        if (validCourseId === null) {
          throw new Error("ID course tidak valid untuk proses update");
        }

        const metadataPayload = shouldPublish
          ? buildCoursePayload(submittedForm, publishStatus)
          : buildDraftCoursePayload(submittedForm);

        return upsertAdminCourseCurriculum(validCourseId, {
          course: metadataPayload,
          ...(includeSections ? { sections: curriculumSectionsPayload ?? [] } : {}),
        });
      }

      const metadataPayload = buildCoursePayload(submittedForm, publishStatus);
      const createdCourse = await createAdminCourse(metadataPayload);

      if (includeSections && (curriculumSectionsPayload?.length ?? 0) > 0) {
        await upsertAdminCourseCurriculum(createdCourse.id, {
          sections: curriculumSectionsPayload,
        });
      }

      return createdCourse;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "courses"] });
      if (validCourseId !== null) {
        queryClient.invalidateQueries({ queryKey: ["admin", "courses", "curriculum", validCourseId] });
      }

      const successMessage =
        variables.intent === "publish"
          ? isEditing
            ? "Course berhasil dipublish"
            : "Course berhasil dipublish"
          : isEditing
            ? "Draft course berhasil disimpan"
            : "Draft course berhasil dibuat";
      toast.success(successMessage);
      router.push("/admin/master-data/courses");
      router.refresh();
    },
    onError: (error) => {
      const nextErrors = mapApiError(error);
      setFormErrors(nextErrors);
      toast.error(nextErrors[FORM_ERROR_KEY] ?? "Gagal menyimpan data course");
    },
  });

  const autoCreateDraftMutation = useMutation({
    mutationFn: async (nextStepIndex: number) => {
      if (isEditing) {
        throw new Error("Auto-create draft hanya berlaku saat membuat course baru.");
      }

      const createdCourse = await createAdminCourse(buildCoursePayload(form, "draft"));
      return {
        createdCourse,
        nextStepIndex,
      };
    },
    onSuccess: ({ createdCourse, nextStepIndex }) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "courses"] });
      const nextStepKey = COURSE_WIZARD_STEPS[nextStepIndex]?.key ?? "curriculum";
      toast.success("Draft course otomatis dibuat.");
      router.replace(`/admin/master-data/courses/${createdCourse.id}?step=${nextStepKey}`);
      router.refresh();
    },
    onError: (error) => {
      const message = normalizeError(error);
      setFormErrors({ [FORM_ERROR_KEY]: message });
      toast.error(message);
    },
  });

  const autosaveMutation = useMutation({
    mutationFn: async ({
      submittedForm,
      fingerprint,
    }: {
      submittedForm: CourseFormState;
      fingerprint: string;
    }) => {
      if (!isEditing || validCourseId === null) {
        throw new Error("Autosave hanya tersedia untuk course yang sudah memiliki ID.");
      }

      const curriculumValidation = z.array(sectionSchema).safeParse(submittedForm.sections);
      const includeSections = curriculumValidation.success;
      const curriculumSectionsPayload = includeSections
        ? buildCurriculumPayloadSections(submittedForm)
        : undefined;

      await upsertAdminCourseCurriculum(validCourseId, {
        course: buildDraftCoursePayload(submittedForm),
        ...(includeSections ? { sections: curriculumSectionsPayload ?? [] } : {}),
      });

      return { fingerprint };
    },
    onSuccess: ({ fingerprint }) => {
      lastAutosavedFingerprintRef.current = fingerprint;
      setLastAutosavedAt(new Date());
      setAutosaveErrorMessage(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "courses", "curriculum", validCourseId] });
    },
    onError: (error) => {
      setAutosaveErrorMessage(normalizeError(error));
    },
  });

  const createSectionMutation = useMutation({
    mutationFn: async (title: string) => {
      const normalizedTitle = title.trim();
      if (!normalizedTitle) {
        throw new Error("Judul section wajib diisi");
      }

      if (validCourseId === null) {
        addSectionLocally(normalizedTitle);
        return null;
      }

      return createAdminSection({
        course_id: validCourseId,
        title: normalizedTitle,
      });
    },
    onSuccess: (section) => {
      if (!section) {
        toast.success("Section berhasil ditambahkan");
        setSectionModalOpen(false);
        setSectionTitleInput("");
        setEditingSectionIndex(null);
        return;
      }

      updateForm((prev) => ({
        ...prev,
        sections: [
          ...prev.sections,
          {
            client_id: createClientId("section"),
            id: section.id,
            title: section.title,
            lessons: [],
          },
        ],
      }));

      queryClient.invalidateQueries({ queryKey: ["admin", "courses", "curriculum", validCourseId] });
      toast.success("Section berhasil ditambahkan");
      setSectionModalOpen(false);
      setSectionTitleInput("");
      setEditingSectionIndex(null);
    },
    onError: (error) => {
      toast.error(normalizeError(error));
    },
  });

  const deleteLessonMutation = useMutation({
    mutationFn: async (lessonId: number) => {
      return deleteAdminLesson(lessonId);
    },
    onSuccess: (message) => {
      toast.success(message || "Lesson berhasil dihapus");
      queryClient.invalidateQueries({ queryKey: ["admin", "courses", "curriculum", validCourseId] });
    },
    onError: (error) => {
      toast.error(normalizeError(error));
    },
  });

  const resetQuizForm = useCallback(() => {
    setEditingQuizId(null);
    setQuizForm(DEFAULT_QUIZ_FORM);
  }, []);

  const saveQuizMutation = useMutation({
    mutationFn: async () => {
      if (validCourseId === null) {
        throw new Error("ID course tidak valid");
      }

      if (!quizForm.section_id || !quizForm.title.trim()) {
        throw new Error("Section dan judul quiz wajib diisi");
      }

      if (
        isInvalidOptionalNumber(quizForm.duration) ||
        isInvalidOptionalNumber(quizForm.passing_score) ||
        isInvalidOptionalNumber(quizForm.weight) ||
        isInvalidOptionalNumber(quizForm.max_attempts)
      ) {
        throw new Error("Durasi, passing score, weight, dan max attempts harus angka >= 0");
      }

      if (editingQuizId) {
        return updateAdminCourseSectionQuiz(validCourseId, Number(quizForm.section_id), editingQuizId, {
          title: quizForm.title.trim(),
          description: quizForm.description.trim() || null,
          duration: toNonNegativeNumberOrZero(quizForm.duration),
          passing_score: toNonNegativeNumberOrZero(quizForm.passing_score),
          weight: toNonNegativeNumberOrZero(quizForm.weight),
          max_attempts: toNonNegativeNumberOrZero(quizForm.max_attempts),
          is_active: quizForm.is_active,
          is_random: quizForm.is_random,
        });
      }

      return createAdminCourseSectionQuiz(validCourseId, Number(quizForm.section_id), {
        title: quizForm.title.trim(),
        description: quizForm.description.trim() || null,
        duration: toNonNegativeNumberOrZero(quizForm.duration),
        passing_score: toNonNegativeNumberOrZero(quizForm.passing_score),
        weight: toNonNegativeNumberOrZero(quizForm.weight),
        max_attempts: toNonNegativeNumberOrZero(quizForm.max_attempts),
        is_active: quizForm.is_active,
        is_random: quizForm.is_random,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "courses", "quizzes", validCourseId] });
      toast.success(editingQuizId ? "Quiz berhasil diperbarui" : "Quiz berhasil ditambahkan");
      setQuizModalOpen(false);
      resetQuizForm();
    },
    onError: (error) => {
      toast.error(normalizeError(error));
    },
  });

  const deleteQuizMutation = useMutation({
    mutationFn: deleteAdminQuiz,
    onSuccess: (message) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "courses", "quizzes", validCourseId] });
      toast.success(message || "Quiz berhasil dihapus");
      setConfirmDeleteQuiz(null);
    },
    onError: (error) => {
      toast.error(normalizeError(error));
    },
  });

  const closeQuizModal = useCallback(() => {
    if (saveQuizMutation.isPending) return;
    setQuizModalOpen(false);
    resetQuizForm();
  }, [resetQuizForm, saveQuizMutation.isPending]);

  // SECTION 6: Actions.
  const openCreateSectionModal = () => {
    setEditingSectionIndex(null);
    setSectionTitleInput("");
    setSectionModalOpen(true);
  };

  const openEditSectionModal = (sectionIndex: number) => {
    const targetSection = form.sections[sectionIndex];
    if (!targetSection) return;

    setEditingSectionIndex(sectionIndex);
    setSectionTitleInput(targetSection.title);
    setSectionModalOpen(true);
  };

  const closeSectionModal = () => {
    if (createSectionMutation.isPending) return;
    setSectionModalOpen(false);
    setSectionTitleInput("");
    setEditingSectionIndex(null);
  };

  const submitSectionModal = () => {
    const normalizedTitle = sectionTitleInput.trim();
    if (!normalizedTitle) return;

    if (editingSectionIndex !== null) {
      updateForm(
        (prev) => ({
          ...prev,
          sections: prev.sections.map((section, index) =>
            index === editingSectionIndex ? { ...section, title: normalizedTitle } : section,
          ),
        }),
        true,
      );
      closeSectionModal();
      toast.success("Judul section berhasil diperbarui");
      return;
    }

    createSectionMutation.mutate(sectionTitleInput);
  };

  const openCreateLessonPage = (sectionId?: number) => {
    if (validCourseId === null || !sectionId) {
      toast.error("Section belum tersimpan. Simpan draft dulu sebelum menambah lesson.");
      return;
    }

    if (!canManageQuizzes) {
      toast.error("Simpan course dulu sebelum mengelola curriculum.");
      return;
    }

    router.push(
      `/admin/master-data/courses/${validCourseId}/sections/${sectionId}/lessons/new?returnTo=${encodeURIComponent(curriculumReturnTo)}`,
    );
  };

  const openEditLessonPage = (sectionId?: number, lessonId?: number) => {
    if (validCourseId === null || !sectionId || !lessonId) {
      toast.error("Lesson belum tersimpan. Simpan draft dulu sebelum mengubah lesson.");
      return;
    }

    if (!canManageQuizzes) {
      toast.error("Simpan course dulu sebelum mengelola curriculum.");
      return;
    }

    router.push(
      `/admin/master-data/courses/${validCourseId}/sections/${sectionId}/lessons/${lessonId}/edit?returnTo=${encodeURIComponent(curriculumReturnTo)}`,
    );
  };

  const openCreateQuizPage = (sectionId?: number) => {
    if (validCourseId === null || !sectionId) {
      toast.error("Section belum tersimpan. Simpan draft dulu sebelum menambah quiz.");
      return;
    }

    if (!canManageQuizzes) {
      toast.error("Simpan course dulu sebelum mengelola quiz.");
      return;
    }

    router.push(
      `/admin/master-data/courses/${validCourseId}/sections/${sectionId}/quizzes/new?returnTo=${encodeURIComponent(curriculumReturnTo)}`,
    );
  };

  const openQuizDetail = (quizId: number) => {
    if (validCourseId === null) return;
    router.push(`/admin/master-data/courses/${validCourseId}/quizzes/${quizId}`);
  };

  const handleConfirmDeleteLesson = () => {
    if (!confirmDeleteLesson) return;

    const { sectionIndex, lessonIndex, lessonId } = confirmDeleteLesson;

    if (lessonId && validCourseId !== null) {
      deleteLessonMutation.mutate(lessonId, {
        onSuccess: () => {
          updateForm((prev) => ({
            ...prev,
            sections: prev.sections.map((currentSection, currentSectionIndex) =>
              currentSectionIndex === sectionIndex
                ? {
                    ...currentSection,
                    lessons: currentSection.lessons.filter((_, idx) => idx !== lessonIndex),
                  }
                : currentSection,
            ),
          }));
          setConfirmDeleteLesson(null);
        },
      });
      return;
    }

    removeLesson(sectionIndex, lessonIndex);
    setConfirmDeleteLesson(null);
  };

  const handlePublish = () => {
    if (isEditing && validCourseId === null) {
      setFormErrors({ [FORM_ERROR_KEY]: "ID course tidak valid." });
      return;
    }

    const validationResult = courseFormSchema.safeParse(form);
    if (!validationResult.success) {
      setFormErrors(mapSchemaErrors(validationResult.error));
      return;
    }

    setFormErrors({});
    saveMutation.mutate({
      submittedForm: form,
      intent: "publish",
      includeSections: true,
    });
  };

  const handleSaveDraft = () => {
    if (isEditing && validCourseId === null) {
      setFormErrors({ [FORM_ERROR_KEY]: "ID course tidak valid." });
      return;
    }

    if (!isEditing) {
      const isGeneralValid = validateStep(0);
      const isSettingsValid = validateStep(2);
      if (!isGeneralValid) {
        setActiveStepIndex(0);
        return;
      }
      if (!isSettingsValid) {
        setActiveStepIndex(2);
        return;
      }
    }

    const curriculumValidation = z.array(sectionSchema).safeParse(form.sections);
    const includeSections = curriculumValidation.success;

    if (!includeSections && form.sections.length > 0) {
      toast.info("Draft tersimpan, tetapi kurikulum yang belum lengkap belum ikut disimpan.");
    }

    setFormErrors({});
    saveMutation.mutate({
      submittedForm: form,
      intent: "draft",
      includeSections,
    });
  };

  const handleCancel = () => {
    if (!confirmLeave()) return;
    router.push("/admin/master-data/courses");
  };

  const retryReferenceData = () => {
    categoryQuery.refetch();
    userQuery.refetch();
  };

  const getFieldError = (path: string): string | undefined => formErrors[path];
  const currentStep = COURSE_WIZARD_STEPS[activeStepIndex];
  const isFirstStep = activeStepIndex === 0;
  const isLastStep = activeStepIndex === COURSE_WIZARD_STEPS.length - 1;
  const isCreateDraftPending = autoCreateDraftMutation.isPending;
  const isPrimaryActionPending = saveMutation.isPending || isCreateDraftPending;
  const autosaveStatusLabel = useMemo(() => {
    if (!isEditing || validCourseId === null) return null;
    if (autosaveMutation.isPending) return "Menyimpan otomatis...";
    if (autosaveErrorMessage) return `Autosave gagal: ${autosaveErrorMessage}`;
    if (lastAutosavedAt) return `Autosave terakhir ${lastAutosavedAt.toLocaleTimeString("id-ID")}`;
    return isDirty ? "Perubahan belum tersimpan otomatis." : "Semua perubahan tersimpan.";
  }, [
    autosaveErrorMessage,
    autosaveMutation.isPending,
    isDirty,
    isEditing,
    lastAutosavedAt,
    validCourseId,
  ]);

  const clearStepErrors = useCallback((prev: CourseFormErrors, stepIndex: number): CourseFormErrors => {
    const next: CourseFormErrors = { ...prev };

    if (stepIndex === 0) {
      delete next.title;
      delete next.category_id;
      delete next.instructor_id;
      delete next.description;
      delete next.requirements;
      delete next.outcomes;
      delete next[FORM_ERROR_KEY];
      return next;
    }

    if (stepIndex === 1) {
      delete next[FORM_ERROR_KEY];
      Object.keys(next).forEach((key) => {
        if (key.startsWith("sections.")) {
          delete next[key];
        }
      });
      return next;
    }

    if (stepIndex === 2) {
      delete next.price;
      delete next.discount_price;
      delete next.status;
      delete next[FORM_ERROR_KEY];
      return next;
    }

    delete next[FORM_ERROR_KEY];
    return next;
  }, []);

  const validateStep = useCallback(
    (stepIndex: number): boolean => {
      const nextErrors: CourseFormErrors = {};

      if (stepIndex === 0) {
        if (!form.title.trim()) {
          nextErrors.title = "Judul course wajib diisi";
        }
        if (!form.category_id.trim()) {
          nextErrors.category_id = "Kategori wajib dipilih";
        }
        if (!form.instructor_id.trim()) {
          nextErrors.instructor_id = "Instructor wajib dipilih";
        }
      }

      if (stepIndex === 1) {
        if (form.sections.length === 0) {
          nextErrors[FORM_ERROR_KEY] = "Tambahkan minimal 1 section sebelum lanjut ke step berikutnya.";
        }

        const totalLessonsCount = form.sections.reduce((total, section) => total + section.lessons.length, 0);
        if (totalLessonsCount === 0) {
          nextErrors[FORM_ERROR_KEY] = "Tambahkan minimal 1 lesson sebelum lanjut ke step berikutnya.";
        }

        form.sections.forEach((section, sectionIndex) => {
          if (!section.title.trim()) {
            nextErrors[`sections.${sectionIndex}.title`] = "Judul section wajib diisi";
          }

          if (section.lessons.length === 0) {
            nextErrors[FORM_ERROR_KEY] = "Setiap section harus memiliki minimal 1 lesson.";
          }

          section.lessons.forEach((lesson, lessonIndex) => {
            if (!lesson.title.trim()) {
              nextErrors[`sections.${sectionIndex}.lessons.${lessonIndex}.title`] = "Judul lesson wajib diisi";
            }
          });
        });
      }

      if (stepIndex === 2) {
        if (!form.price.trim()) {
          nextErrors.price = "Harga wajib diisi";
        } else {
          const priceNumber = Number(form.price);
          if (Number.isNaN(priceNumber) || priceNumber < 0) {
            nextErrors.price = "Harga harus berupa angka positif";
          }
        }

        if (form.discount_price.trim()) {
          const discountNumber = Number(form.discount_price);
          const priceNumber = Number(form.price);
          if (Number.isNaN(discountNumber) || discountNumber < 0) {
            nextErrors.discount_price = "Harga diskon harus berupa angka positif";
          } else if (!Number.isNaN(priceNumber) && discountNumber > priceNumber) {
            nextErrors.discount_price = "Harga diskon tidak boleh lebih besar dari harga utama";
          }
        }
      }

      setFormErrors((prev) => ({
        ...clearStepErrors(prev, stepIndex),
        ...nextErrors,
      }));

      return Object.keys(nextErrors).length === 0;
    },
    [clearStepErrors, form],
  );

  const goToStep = (nextStepIndex: number) => {
    if (autoCreateDraftMutation.isPending) return;
    if (nextStepIndex === activeStepIndex) return;
    if (nextStepIndex < 0 || nextStepIndex >= COURSE_WIZARD_STEPS.length) return;

    if (nextStepIndex < activeStepIndex) {
      setActiveStepIndex(nextStepIndex);
      return;
    }

    for (let stepIndex = activeStepIndex; stepIndex < nextStepIndex; stepIndex += 1) {
      if (!validateStep(stepIndex)) {
        setActiveStepIndex(stepIndex);
        return;
      }
    }

    if (!isEditing && validCourseId === null && activeStepIndex === 0 && nextStepIndex >= 1) {
      autoCreateDraftMutation.mutate(nextStepIndex);
      return;
    }

    setActiveStepIndex(nextStepIndex);
  };

  const handleNextStep = () => {
    goToStep(activeStepIndex + 1);
  };

  const handlePrevStep = () => {
    goToStep(activeStepIndex - 1);
  };

  const handlePublishFromAnyStep = () => {
    const stepIndexesToValidate = [0, 1, 2] as const;
    for (const stepIndex of stepIndexesToValidate) {
      if (!validateStep(stepIndex)) {
        setActiveStepIndex(stepIndex);
        return;
      }
    }
    handlePublish();
  };

  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isEditing || validCourseId === null) return;
    if (!isDirty) return;
    if (saveMutation.isPending || autosaveMutation.isPending || autoCreateDraftMutation.isPending) return;
    if (lastAutosavedFingerprintRef.current === autosaveFingerprint) return;

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    setAutosaveErrorMessage(null);
    autosaveTimerRef.current = setTimeout(() => {
      autosaveMutation.mutate({
        submittedForm: form,
        fingerprint: autosaveFingerprint,
      });
    }, AUTOSAVE_DELAY_MS);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [
    autoCreateDraftMutation.isPending,
    autosaveFingerprint,
    autosaveMutation.isPending,
    form,
    isDirty,
    isEditing,
    saveMutation.isPending,
    validCourseId,
  ]);

  useEffect(() => {
    if (activeStepIndex !== 1) return;

    const container = sectionListRef.current;
    if (!container || form.sections.length < 2) return;

    const sortable = Sortable.create(container, {
      animation: 150,
      handle: "[data-section-drag-handle='true']",
      draggable: "[data-section-draggable='true']",
      onEnd: (event: SortableEvent) => {
        if (event.oldIndex == null || event.newIndex == null || event.oldIndex === event.newIndex) {
          return;
        }

        updateForm((prev) => {
          const nextSections = [...prev.sections];
          const [movedSection] = nextSections.splice(event.oldIndex!, 1);
          nextSections.splice(event.newIndex!, 0, movedSection);
          return {
            ...prev,
            sections: nextSections,
          };
        });
      },
    });

    return () => {
      sortable.destroy();
    };
  }, [activeStepIndex, form.sections.length, updateForm]);

  useEffect(() => {
    if (activeStepIndex !== 1) return;

    const containers = Array.from(
      document.querySelectorAll<HTMLElement>("[data-lesson-sortable='true']"),
    );
    if (containers.length === 0) return;

    const instances: Sortable[] = [];

    containers.forEach((container) => {
      const sectionIndex = Number(container.dataset.sectionIndex);
      if (!Number.isInteger(sectionIndex) || sectionIndex < 0) return;

      const lessons = form.sections[sectionIndex]?.lessons ?? [];
      if (lessons.length < 2) return;

      const instance = Sortable.create(container, {
        animation: 150,
        handle: "[data-lesson-drag-handle='true']",
        draggable: "[data-lesson-draggable='true']",
        onEnd: (event: SortableEvent) => {
          if (event.oldIndex == null || event.newIndex == null || event.oldIndex === event.newIndex) {
            return;
          }

          updateForm((prev) => {
            const targetSection = prev.sections[sectionIndex];
            if (!targetSection) return prev;

            const nextLessons = [...targetSection.lessons];
            const [movedLesson] = nextLessons.splice(event.oldIndex!, 1);
            nextLessons.splice(event.newIndex!, 0, movedLesson);

            return {
              ...prev,
              sections: prev.sections.map((section, index) =>
                index === sectionIndex
                  ? {
                      ...section,
                      lessons: nextLessons,
                    }
                  : section,
              ),
            };
          });
        },
      });

      instances.push(instance);
    });

    return () => {
      instances.forEach((instance) => instance.destroy());
    };
  }, [activeStepIndex, form.sections, updateForm]);


  // SECTION 7: Guard states.
  if (isEditing && validCourseId === null) {
    return (
      <section className="space-y-5">
        <AdminPageHeader title="Detail Course" description="ID course tidak valid." />
        <Card className="border border-[var(--danger-soft-border)] bg-[var(--danger-soft-bg)] shadow-sm">
          <CardContent className="space-y-3 p-5">
            <p className="text-sm text-[var(--danger-soft-foreground)]">ID course tidak valid untuk proses edit.</p>
            <Button type="button" variant="outline" onClick={handleCancel}>
              <ArrowLeft className="size-4" />
              <span>Kembali ke daftar course</span>
            </Button>
          </CardContent>
        </Card>
      </section>
    );
  }

  if (isEditing && curriculumQuery.isLoading) {
    return (
      <section className="space-y-5">
        <AdminPageHeader title="Detail Course" description="Memuat detail course dan kurikulum..." />
        <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <CardContent className="flex items-center gap-2 p-5 text-sm text-[var(--muted-foreground)]">
            <Loader2 className="size-4 animate-spin" />
            Memuat data course...
          </CardContent>
        </Card>
      </section>
    );
  }

  if (isEditing && curriculumQuery.isError) {
    return (
      <section className="space-y-5">
        <AdminPageHeader
          title="Detail Course"
          description="Data course tidak dapat dimuat. Coba kembali ke daftar course."
        />
        <Card className="border border-[var(--danger-soft-border)] bg-[var(--danger-soft-bg)] shadow-sm">
          <CardContent className="space-y-3 p-5">
            <p className="text-sm text-[var(--danger-soft-foreground)]">Gagal memuat data course untuk proses edit.</p>
            <Button type="button" variant="outline" onClick={handleCancel}>
              <ArrowLeft className="size-4" />
              <span>Kembali ke daftar course</span>
            </Button>
          </CardContent>
        </Card>
      </section>
    );
  }

  const isReferenceLoading = categoryQuery.isLoading || userQuery.isLoading;
  const isReferenceError = categoryQuery.isError || userQuery.isError;

  return (
    <section className="space-y-5">
      <AdminPageHeader
        title={isEditing ? "Detail Course" : "Buat Course"}
        description="Kelola course dengan alur bertahap: General Info, Curriculum, Settings, lalu Publish."
      />

      <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
        <CardHeader className="border-b border-[var(--border)] p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-[var(--foreground)]">
                {isEditing ? "Edit Course (Step by Step)" : "Buat Course (Step by Step)"}
              </CardTitle>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Isi form per langkah agar manajemen course dan kurikulum lebih terstruktur.
              </p>
            </div>

            <Button type="button" variant="outline" onClick={handleCancel}>
              <ArrowLeft className="size-4" />
              <span>Kembali ke Daftar</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 p-5">
          {getFieldError(FORM_ERROR_KEY) ? (
            <div className="flex items-start gap-2 rounded-md border border-[var(--danger-soft-border)] bg-[var(--danger-soft-bg)] px-3 py-2 text-sm text-[var(--danger-soft-foreground)]">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>{getFieldError(FORM_ERROR_KEY)}</span>
            </div>
          ) : null}

          <section className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--muted)] p-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {COURSE_WIZARD_STEPS.map((step, stepIndex) => {
                const isCurrent = activeStepIndex === stepIndex;
                const isCompleted = activeStepIndex > stepIndex;

                return (
                  <button
                    key={step.key}
                    type="button"
                    onClick={() => goToStep(stepIndex)}
                    disabled={isCreateDraftPending}
                    className="rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-left transition hover:bg-[var(--surface-hover)]"
                  >
                    <span
                      className={`inline-flex size-6 items-center justify-center rounded-full text-xs font-semibold ${
                        isCurrent
                          ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                          : isCompleted
                            ? "bg-emerald-600 text-white"
                            : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                      }`}
                    >
                      {stepIndex + 1}
                    </span>
                    <p className="mt-2 text-xs font-semibold text-[var(--foreground)]">{step.label}</p>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-[var(--muted-foreground)]">{currentStep.description}</p>
          </section>

          {activeStepIndex === 0 || activeStepIndex === 2 ? (
            <section className="space-y-4 rounded-lg border border-[var(--border)] bg-[var(--muted)] p-4">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">
              {activeStepIndex === 0 ? "Informasi Utama Course" : "Pengaturan Course"}
            </h3>

            {activeStepIndex === 0 && isReferenceLoading ? (
              <div className="flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs text-[var(--muted-foreground)]">
                <Loader2 className="size-3.5 animate-spin" />
                Memuat data kategori dan instructor...
              </div>
            ) : null}

            {activeStepIndex === 0 && isReferenceError ? (
              <div className="flex items-center justify-between gap-3 rounded-md border border-[var(--danger-soft-border)] bg-[var(--danger-soft-bg)] px-3 py-2 text-xs text-[var(--danger-soft-foreground)]">
                <span className="inline-flex items-center gap-1.5">
                  <AlertTriangle className="size-3.5" />
                  Gagal memuat referensi kategori/instructor.
                </span>
                <Button type="button" variant="outline" size="sm" onClick={retryReferenceData} className="h-7">
                  <RefreshCw className="size-3.5" />
                  <span>Coba Lagi</span>
                </Button>
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {activeStepIndex === 0 ? (
                <>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label htmlFor="course-title">Judul Course</Label>
                    <Input
                      id="course-title"
                      value={form.title}
                      onChange={(event) => updateField("title", event.target.value)}
                      className="border-[var(--border)] bg-[var(--card)]"
                    />
                    {getFieldError("title") ? <p className="text-xs text-red-600">{getFieldError("title")}</p> : null}
                  </div>

                  <div className="space-y-1.5">
                    <Label>Kategori</Label>
                    <Select
                      value={form.category_id}
                      onValueChange={(value) => updateField("category_id", value ?? "")}
                      disabled={isReferenceLoading || isReferenceError}
                    >
                      <SelectTrigger className="h-9 w-full border-[var(--border)] bg-[var(--card)]">
                        <SelectValue>
                          {() => {
                            const label =
                              selectedCategoryLabel ??
                              (isReferenceLoading
                                ? "Memuat kategori..."
                                : isReferenceError
                                  ? "Gagal memuat kategori"
                                  : "Pilih kategori");

                            return (
                              <span className={selectedCategoryLabel ? undefined : "text-[var(--muted-foreground)]"}>
                                {label}
                              </span>
                            );
                          }}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {(categoryQuery.data ?? []).map((category) => (
                          <SelectItem key={category.id} value={String(category.id)}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {getFieldError("category_id") ? (
                      <p className="text-xs text-red-600">{getFieldError("category_id")}</p>
                    ) : null}
                  </div>

                  <div className="space-y-1.5">
                    <Label>Instructor</Label>
                    <Select
                      value={form.instructor_id}
                      onValueChange={(value) => updateField("instructor_id", value ?? "")}
                      disabled={isReferenceLoading || isReferenceError}
                    >
                      <SelectTrigger className="h-9 w-full border-[var(--border)] bg-[var(--card)]">
                        <SelectValue>
                          {() => {
                            const label =
                              selectedInstructorLabel ??
                              (isReferenceLoading
                                ? "Memuat instructor..."
                                : isReferenceError
                                  ? "Gagal memuat instructor"
                                  : "Pilih instructor");

                            return (
                              <span className={selectedInstructorLabel ? undefined : "text-[var(--muted-foreground)]"}>
                                {label}
                              </span>
                            );
                          }}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {(userQuery.data ?? []).map((user) => (
                          <SelectItem key={user.id} value={String(user.id)}>
                            {user.fullname} ({user.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {getFieldError("instructor_id") ? (
                      <p className="text-xs text-red-600">{getFieldError("instructor_id")}</p>
                    ) : null}
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <Label htmlFor="course-description">Deskripsi</Label>
                    <Textarea
                      id="course-description"
                      rows={3}
                      value={form.description}
                      onChange={(event) => updateField("description", event.target.value)}
                      className="border-[var(--border)] bg-[var(--card)]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="course-requirements">Requirements</Label>
                    <Textarea
                      id="course-requirements"
                      rows={3}
                      value={form.requirements}
                      onChange={(event) => updateField("requirements", event.target.value)}
                      className="border-[var(--border)] bg-[var(--card)]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="course-outcomes">Outcomes</Label>
                    <Textarea
                      id="course-outcomes"
                      rows={3}
                      value={form.outcomes}
                      onChange={(event) => updateField("outcomes", event.target.value)}
                      className="border-[var(--border)] bg-[var(--card)]"
                    />
                  </div>
                </>
              ) : null}

              {activeStepIndex === 2 ? (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="course-price">Harga</Label>
                    <Input
                      id="course-price"
                      type="number"
                      min={0}
                      value={form.price}
                      onChange={(event) => updateField("price", event.target.value)}
                      className="border-[var(--border)] bg-[var(--card)]"
                    />
                    {getFieldError("price") ? <p className="text-xs text-red-600">{getFieldError("price")}</p> : null}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="course-discount">Harga Diskon</Label>
                    <Input
                      id="course-discount"
                      type="number"
                      min={0}
                      value={form.discount_price}
                      onChange={(event) => updateField("discount_price", event.target.value)}
                      className="border-[var(--border)] bg-[var(--card)]"
                    />
                    {getFieldError("discount_price") ? (
                      <p className="text-xs text-red-600">{getFieldError("discount_price")}</p>
                    ) : null}
                  </div>

                  <div className="rounded-md border border-dashed border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs text-[var(--muted-foreground)] md:col-span-2">
                    Status tidak diinput manual. Gunakan tombol <span className="font-semibold">Simpan Draft</span> atau{" "}
                    <span className="font-semibold">Publish</span> di bagian bawah.
                  </div>
                </>
              ) : null}
            </div>
            </section>
          ) : null}

          {activeStepIndex === 1 ? (
            <section className="space-y-4 rounded-lg border border-[var(--border)] bg-[var(--muted)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-[var(--foreground)]">Struktur Materi (Section & Lesson)</h3>
              <Button
                type="button"
                onClick={openCreateSectionModal}
                disabled={createSectionMutation.isPending}
                className="bg-[var(--primary)] text-[var(--primary-foreground)] hover:brightness-95"
              >
                <Plus className="size-4" />
                <span>Tambah Section</span>
              </Button>
            </div>

            <p className="text-xs text-[var(--muted-foreground)]">
              Urutan section dan lesson mengikuti posisi daftar dari atas ke bawah.
            </p>

            {form.sections.length === 0 ? (
              <div className="rounded-md border border-dashed border-[var(--border)] bg-[var(--card)] px-4 py-5 text-center text-sm text-[var(--muted-foreground)]">
                Belum ada section. Klik <span className="font-medium">Tambah Section</span> untuk mulai menyusun materi.
              </div>
            ) : null}

            <div ref={sectionListRef} className="space-y-4">
              {form.sections.map((section, sectionIndex) => (
                <div
                  key={section.client_id}
                  data-section-draggable="true"
                  className="space-y-3 rounded-md border border-[var(--border)] bg-[var(--card)] p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        data-section-drag-handle="true"
                        className="rounded-sm border border-[var(--border)] bg-[var(--muted)] p-1 text-[var(--muted-foreground)]"
                        aria-label={`Ubah urutan section ${sectionIndex + 1}`}
                      >
                        <GripVertical className="size-3.5" />
                      </button>
                      <p className="text-sm font-semibold text-[var(--foreground)]">
                        Section {sectionIndex + 1}: {section.title.trim() || "--judul section--"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openEditSectionModal(sectionIndex)}
                        className="border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]"
                      >
                        <Pencil className="size-4" />
                        <span>Edit Section</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-[var(--danger-soft-border)] bg-[var(--danger-soft-bg)] text-[var(--danger-soft-foreground)] hover:opacity-90"
                        onClick={() =>
                          setConfirmDeleteSection({
                            sectionIndex,
                            sectionTitle: section.title.trim() || `Section ${sectionIndex + 1}`,
                          })
                        }
                      >
                        <Trash2 className="size-4" />
                        <span>Hapus Section</span>
                      </Button>
                    </div>
                  </div>

                  {getFieldError(`sections.${sectionIndex}.title`) ? (
                    <p className="text-xs text-red-600">{getFieldError(`sections.${sectionIndex}.title`)}</p>
                  ) : null}

                  {isEditing && validCourseId !== null ? (
                    <div className="space-y-3 rounded-md border border-[var(--border)] bg-[var(--muted)] p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                          Quizzes
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => openCreateQuizPage(section.id)}
                          disabled={!canManageQuizzes || !section.id}
                        >
                          <Plus className="size-4" />
                          <span>Tambah Quiz</span>
                        </Button>
                      </div>

                      {!canManageQuizzes ? (
                        <p className="text-xs text-[var(--muted-foreground)]">
                          Simpan course dulu sebelum mengelola quiz.
                        </p>
                      ) : null}

                      {!section.id ? (
                        <p className="text-xs text-[var(--muted-foreground)]">
                          Simpan course dulu agar section mendapat ID dan bisa dipakai untuk quiz.
                        </p>
                      ) : courseQuizzesQuery.isLoading ? (
                        <p className="text-xs text-[var(--muted-foreground)]">Memuat quiz section...</p>
                      ) : courseQuizzesQuery.isError ? (
                        <p className="text-xs text-red-600">Gagal memuat quiz. Coba refresh halaman.</p>
                      ) : ((quizzesBySectionId.get(section.id) ?? []).length > 0) ? (
                        <div className="space-y-2">
                          {(quizzesBySectionId.get(section.id) ?? []).map((quiz) => (
                            <div
                              key={quiz.id}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-2"
                            >
                              <div className="min-w-0">
                                <button
                                  type="button"
                                  onClick={() => openQuizDetail(quiz.id)}
                                  className="truncate text-left text-sm font-medium text-[var(--foreground)] hover:underline"
                                >
                                  {quiz.title}
                                </button>
                                <p className="text-xs text-[var(--muted-foreground)]">
                                  Passing {quiz.passing_score ?? "-"} | Durasi {quiz.duration ?? "-"} menit
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon-sm"
                                  onClick={() => openQuizDetail(quiz.id)}
                                  disabled={!canManageQuizzes}
                                  className="border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]"
                                  aria-label={`Edit quiz ${quiz.title}`}
                                >
                                  <Pencil className="size-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="icon-sm"
                                  disabled={!canManageQuizzes || deleteQuizMutation.isPending}
                                  onClick={() => {
                                    setConfirmDeleteQuiz(quiz);
                                  }}
                                  className="border-[var(--danger-soft-border)] bg-[var(--danger-soft-bg)] text-[var(--danger-soft-foreground)] hover:opacity-90"
                                  aria-label={`Hapus quiz ${quiz.title}`}
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-[var(--muted-foreground)]">
                          Belum ada quiz pada section ini.
                        </p>
                      )}
                    </div>
                  ) : null}

                  <div className="space-y-3 rounded-md border border-[var(--border)] bg-[var(--muted)] p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                        Lessons
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openCreateLessonPage(section.id)}
                        disabled={!canManageQuizzes || !section.id}
                      >
                        <Plus className="size-4" />
                        <span>Tambah Lesson</span>
                      </Button>
                    </div>

                    {!canManageQuizzes ? (
                      <p className="text-xs text-[var(--muted-foreground)]">
                        Simpan course dulu sebelum mengelola lesson.
                      </p>
                    ) : null}

                    {!section.id ? (
                      <p className="text-xs text-[var(--muted-foreground)]">
                        Simpan course dulu agar section mendapat ID dan bisa dipakai untuk lesson.
                      </p>
                    ) : null}

                    {section.lessons.length === 0 ? (
                      <p className="text-xs text-[var(--muted-foreground)]">Belum ada lesson di section ini.</p>
                    ) : null}

                    <div data-lesson-sortable="true" data-section-index={sectionIndex} className="space-y-2">
                      {section.lessons.map((lesson, lessonIndex) => (
                        <div
                          key={lesson.client_id}
                          data-lesson-draggable="true"
                          className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-2"
                        >
                          <div className="flex min-w-0 items-start gap-2">
                            <button
                              type="button"
                              data-lesson-drag-handle="true"
                              className="mt-1 cursor-grab text-[var(--muted-foreground)] active:cursor-grabbing"
                              aria-label={`Ubah urutan ${lesson.title || `lesson ${lessonIndex + 1}`}`}
                            >
                              <GripVertical className="size-4" />
                            </button>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-[var(--foreground)]">
                                {lesson.title || `Lesson ${lessonIndex + 1}`}
                              </p>
                              <p className="text-xs text-[var(--muted-foreground)]">
                                {lesson.type === "video" ? "Video Lesson" : "File Lesson"} | Durasi {lesson.duration || "-"} menit
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon-sm"
                              onClick={() => openEditLessonPage(section.id, lesson.id)}
                              disabled={!canManageQuizzes || !section.id || !lesson.id}
                              className="border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]"
                              aria-label={`Edit lesson ${lesson.title}`}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon-sm"
                              disabled={deleteLessonMutation.isPending}
                              onClick={() =>
                                setConfirmDeleteLesson({
                                  sectionIndex,
                                  lessonIndex,
                                  lessonId: lesson.id,
                                  lessonTitle: lesson.title || `Lesson ${lessonIndex + 1}`,
                                })
                              }
                              className="border-[var(--danger-soft-border)] bg-[var(--danger-soft-bg)] text-[var(--danger-soft-foreground)] hover:opacity-90"
                              aria-label={`Hapus lesson ${lesson.title}`}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            </section>
          ) : null}

          {activeStepIndex === 3 ? (
            <section className="space-y-4 rounded-lg border border-[var(--border)] bg-[var(--muted)] p-4">
              <h3 className="text-sm font-semibold text-[var(--foreground)]">Review Sebelum Publish</h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-md border border-[var(--border)] bg-[var(--card)] p-3">
                  <p className="text-xs text-[var(--muted-foreground)]">Judul Course</p>
                  <p className="mt-1 text-sm font-medium text-[var(--foreground)]">{form.title || "-"}</p>
                </div>
                <div className="rounded-md border border-[var(--border)] bg-[var(--card)] p-3">
                  <p className="text-xs text-[var(--muted-foreground)]">Status Tersimpan Saat Ini</p>
                  <p className="mt-1 text-sm font-medium text-[var(--foreground)]">{form.status}</p>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                    Aksi berikutnya ditentukan tombol <span className="font-semibold">Simpan Draft</span> atau{" "}
                    <span className="font-semibold">Publish</span>.
                  </p>
                </div>
                <div className="rounded-md border border-[var(--border)] bg-[var(--card)] p-3">
                  <p className="text-xs text-[var(--muted-foreground)]">Kategori</p>
                  <p className="mt-1 text-sm font-medium text-[var(--foreground)]">{selectedCategoryLabel ?? "-"}</p>
                </div>
                <div className="rounded-md border border-[var(--border)] bg-[var(--card)] p-3">
                  <p className="text-xs text-[var(--muted-foreground)]">Instructor</p>
                  <p className="mt-1 text-sm font-medium text-[var(--foreground)]">{selectedInstructorLabel ?? "-"}</p>
                </div>
                <div className="rounded-md border border-[var(--border)] bg-[var(--card)] p-3">
                  <p className="text-xs text-[var(--muted-foreground)]">Jumlah Section</p>
                  <p className="mt-1 text-sm font-medium text-[var(--foreground)]">{form.sections.length}</p>
                </div>
                <div className="rounded-md border border-[var(--border)] bg-[var(--card)] p-3">
                  <p className="text-xs text-[var(--muted-foreground)]">Jumlah Lesson</p>
                  <p className="mt-1 text-sm font-medium text-[var(--foreground)]">{totalLessons}</p>
                </div>
              </div>
              <p className="text-xs text-[var(--muted-foreground)]">
                Klik tombol <span className="font-semibold">Simpan Draft</span> atau{" "}
                <span className="font-semibold">Publish</span> untuk menyelesaikan proses.
              </p>
            </section>
          ) : null}
        </CardContent>
      </Card>

      <AdminModal
        open={sectionModalOpen}
        onClose={closeSectionModal}
        title={editingSectionIndex === null ? "Tambah Section" : "Edit Section"}
        description={
          editingSectionIndex === null
            ? "Masukkan nama section baru untuk kurikulum course ini."
            : "Perbarui judul section agar struktur kurikulum lebih jelas."
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5 rounded-lg border border-[var(--border)] bg-[var(--muted)] p-4">
            <Label htmlFor="new-section-title">Judul Section</Label>
            <Input
              id="new-section-title"
              autoFocus
              value={sectionTitleInput}
              onChange={(event) => setSectionTitleInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  submitSectionModal();
                }
              }}
              className="border-[var(--border)] bg-[var(--card)]"
              placeholder="Contoh: Pertemuan 1"
            />
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--border)] pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={closeSectionModal}
              disabled={createSectionMutation.isPending}
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={submitSectionModal}
              disabled={createSectionMutation.isPending || !sectionTitleInput.trim()}
              className="bg-[var(--primary)] text-[var(--primary-foreground)] hover:brightness-95"
            >
              {createSectionMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              <span>{editingSectionIndex === null ? "Simpan Section" : "Simpan Perubahan"}</span>
            </Button>
          </div>
        </div>
      </AdminModal>

      <AdminModal
        open={quizModalOpen}
        onClose={closeQuizModal}
        title={editingQuizId ? "Edit Quiz" : "Tambah Quiz"}
        description="Quiz akan terhubung ke section yang dipilih dalam course ini."
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 rounded-lg border border-[var(--border)] bg-[var(--muted)] p-4 md:grid-cols-2">
            <div className="space-y-1.5 md:col-span-2">
              <Label>Section</Label>
              <Select
                value={quizForm.section_id}
                onValueChange={(value) => setQuizForm((prev) => ({ ...prev, section_id: value ?? "" }))}
              >
                <SelectTrigger className="h-9 w-full border-[var(--border)] bg-[var(--card)]">
                  <SelectValue>
                    {() => {
                      const label = selectedQuizSectionLabel ?? "Pilih section";
                      return (
                        <span className={selectedQuizSectionLabel ? undefined : "text-[var(--muted-foreground)]"}>
                          {label}
                        </span>
                      );
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {form.sections
                    .filter((section) => section.id)
                    .map((section, index) => (
                      <SelectItem key={section.client_id} value={String(section.id)}>
                        {getSectionDisplayLabel(section, index)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="quiz-title">Judul Quiz</Label>
              <Input
                id="quiz-title"
                value={quizForm.title}
                onChange={(event) => setQuizForm((prev) => ({ ...prev, title: event.target.value }))}
                className="border-[var(--border)] bg-[var(--card)]"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="quiz-description">Deskripsi</Label>
              <Textarea
                id="quiz-description"
                rows={3}
                value={quizForm.description}
                onChange={(event) => setQuizForm((prev) => ({ ...prev, description: event.target.value }))}
                className="border-[var(--border)] bg-[var(--card)]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="quiz-duration">Durasi (menit)</Label>
              <Input
                id="quiz-duration"
                type="number"
                min={0}
                value={quizForm.duration}
                onChange={(event) => setQuizForm((prev) => ({ ...prev, duration: event.target.value }))}
                className="border-[var(--border)] bg-[var(--card)]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="quiz-passing-score">Passing Score</Label>
              <Input
                id="quiz-passing-score"
                type="number"
                min={0}
                value={quizForm.passing_score}
                onChange={(event) => setQuizForm((prev) => ({ ...prev, passing_score: event.target.value }))}
                className="border-[var(--border)] bg-[var(--card)]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="quiz-weight">Weight</Label>
              <Input
                id="quiz-weight"
                type="number"
                min={0}
                value={quizForm.weight}
                onChange={(event) => setQuizForm((prev) => ({ ...prev, weight: event.target.value }))}
                className="border-[var(--border)] bg-[var(--card)]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="quiz-max-attempts">Max Attempts</Label>
              <Input
                id="quiz-max-attempts"
                type="number"
                min={0}
                value={quizForm.max_attempts}
                onChange={(event) => setQuizForm((prev) => ({ ...prev, max_attempts: event.target.value }))}
                className="border-[var(--border)] bg-[var(--card)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <label
              htmlFor="quiz-is-active"
              className="inline-flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-sm text-[var(--foreground)]"
            >
              <Checkbox
                id="quiz-is-active"
                checked={quizForm.is_active}
                onCheckedChange={(checked) => setQuizForm((prev) => ({ ...prev, is_active: checked }))}
              />
              Quiz aktif
            </label>

            <label
              htmlFor="quiz-is-random"
              className="inline-flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-sm text-[var(--foreground)]"
            >
              <Checkbox
                id="quiz-is-random"
                checked={quizForm.is_random}
                onCheckedChange={(checked) => setQuizForm((prev) => ({ ...prev, is_random: checked }))}
              />
              Soal diacak
            </label>
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--border)] pt-3">
            <Button type="button" variant="outline" onClick={closeQuizModal} disabled={saveQuizMutation.isPending}>
              Batal
            </Button>
            <Button
              type="button"
              onClick={() => saveQuizMutation.mutate()}
              disabled={saveQuizMutation.isPending}
              className="bg-[var(--primary)] text-[var(--primary-foreground)] hover:brightness-95"
            >
              {saveQuizMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              <span>{editingQuizId ? "Simpan Perubahan" : "Simpan Quiz"}</span>
            </Button>
          </div>
        </div>
      </AdminModal>

      <ConfirmAlertDialog
        open={confirmDeleteQuiz !== null}
        title="Hapus Quiz"
        description={
          confirmDeleteQuiz
            ? `Quiz "${confirmDeleteQuiz.title}" akan dihapus permanen. Aksi ini tidak dapat dibatalkan.`
            : ""
        }
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        isPending={deleteQuizMutation.isPending}
        onClose={() => {
          if (deleteQuizMutation.isPending) return;
          setConfirmDeleteQuiz(null);
        }}
        onConfirm={() => {
          if (!confirmDeleteQuiz) return;
          deleteQuizMutation.mutate(confirmDeleteQuiz.id);
        }}
      />

      <ConfirmAlertDialog
        open={confirmDeleteSection !== null}
        title="Hapus Section"
        description={
          confirmDeleteSection
            ? `Section "${confirmDeleteSection.sectionTitle}" akan dihapus dari draft kurikulum ini.`
            : ""
        }
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        isPending={false}
        onClose={() => {
          setConfirmDeleteSection(null);
        }}
        onConfirm={() => {
          if (!confirmDeleteSection) return;
          removeSection(confirmDeleteSection.sectionIndex);
          setConfirmDeleteSection(null);
        }}
      />

      <ConfirmAlertDialog
        open={confirmDeleteLesson !== null}
        title="Hapus Lesson"
        description={
          confirmDeleteLesson
            ? `Lesson "${confirmDeleteLesson.lessonTitle}" akan dihapus dari section ini.`
            : ""
        }
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        isPending={deleteLessonMutation.isPending}
        onClose={() => {
          if (deleteLessonMutation.isPending) return;
          setConfirmDeleteLesson(null);
        }}
        onConfirm={handleConfirmDeleteLesson}
      />

      <div className="sticky bottom-4 z-20">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[var(--border)] bg-[var(--card)] p-3 shadow-lg">
          <p className="text-xs text-[var(--muted-foreground)]">
            Step {activeStepIndex + 1}/{COURSE_WIZARD_STEPS.length}:{" "}
            <span className="font-semibold text-[var(--foreground)]">{currentStep.label}</span>
          </p>
          {autosaveStatusLabel ? <p className="text-xs text-[var(--muted-foreground)]">{autosaveStatusLabel}</p> : null}

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevStep}
              disabled={isPrimaryActionPending || isFirstStep}
            >
              <ArrowLeft className="size-4" />
              <span>Previous</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleSaveDraft}
              disabled={isPrimaryActionPending}
              className="border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
            >
              {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              <span>Simpan Draft</span>
            </Button>

            <Button
              type="button"
              onClick={isLastStep ? handlePublishFromAnyStep : handleNextStep}
              disabled={isPrimaryActionPending}
              className="bg-[var(--primary)] text-[var(--primary-foreground)] hover:brightness-95"
            >
              {isPrimaryActionPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : isLastStep ? (
                <Save className="size-4" />
              ) : (
                <ArrowRight className="size-4" />
              )}
              <span>{isLastStep ? "Publish" : "Next"}</span>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

