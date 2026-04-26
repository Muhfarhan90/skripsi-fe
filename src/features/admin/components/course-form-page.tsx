"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, Loader2, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import {
  createAdminCourse,
  getAdminCategories,
  getAdminCourseCurriculum,
  getAdminUsers,
  upsertAdminCourseCurriculum,
  type AdminCourseCurriculum,
  type CoursePayload,
  type CourseCurriculumSectionPayload,
} from "@/features/admin/api/master-api";
import { useUnsavedChangesGuard } from "@/features/admin/hooks/use-unsaved-changes-guard";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type CourseFormMode = "create" | "edit";
type LessonType = "video" | "file" | "quiz";

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

type CourseFormErrors = Record<string, string>;

const FORM_ERROR_KEY = "__form";

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
    type: z.enum(["video", "file", "quiz"]),
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
    if (lesson.type === "quiz") return;

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

function createEmptyLesson(): LessonFormState {
  return {
    client_id: createClientId("lesson"),
    title: "",
    description: "",
    type: "video",
    lesson_url: "",
    duration: "",
    is_preview: false,
  };
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

function buildCoursePayload(form: CourseFormState): CoursePayload {
  return {
    title: form.title.trim(),
    description: form.description.trim() || null,
    category_id: Number(form.category_id),
    instructor_id: Number(form.instructor_id),
    price: Number(form.price),
    discount_price: form.discount_price.trim() ? Number(form.discount_price) : null,
    status: form.status,
    requirements: form.requirements.trim() || null,
    outcomes: form.outcomes.trim() || null,
  };
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
  const queryClient = useQueryClient();
  const isEditing = mode === "edit";
  const validCourseId = isValidCourseId(courseId) ? courseId : null;
  const [draftForm, setDraftForm] = useState<CourseFormState | null>(null);
  const [formErrors, setFormErrors] = useState<CourseFormErrors>({});

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

  // SECTION 3: Base form source and updater helpers.
  const baseForm = useMemo<CourseFormState>(() => {
    if (isEditing && curriculumQuery.data) {
      return mapCurriculumToFormState(curriculumQuery.data);
    }
    return DEFAULT_FORM;
  }, [curriculumQuery.data, isEditing]);

  const form = draftForm ?? baseForm;
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

  const addSection = () => {
    updateForm(
      (prev) => ({
        ...prev,
        sections: [...prev.sections, createEmptySection()],
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

  const updateSectionTitle = (sectionIndex: number, value: string) => {
    updateForm((prev) => ({
      ...prev,
      sections: prev.sections.map((section, index) =>
        index === sectionIndex ? { ...section, title: value } : section,
      ),
    }));
  };

  const addLesson = (sectionIndex: number) => {
    updateForm(
      (prev) => ({
        ...prev,
        sections: prev.sections.map((section, index) =>
          index === sectionIndex
            ? {
                ...section,
                lessons: [...section.lessons, createEmptyLesson()],
              }
            : section,
        ),
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

  const updateLessonField = useCallback(
    <K extends Exclude<keyof LessonFormState, "client_id" | "id">>(
      sectionIndex: number,
      lessonIndex: number,
      key: K,
      value: LessonFormState[K],
    ) => {
      updateForm((prev) => ({
        ...prev,
        sections: prev.sections.map((section, secIndex) =>
          secIndex === sectionIndex
            ? {
                ...section,
                lessons: section.lessons.map((lesson, lesIndex) =>
                  lesIndex === lessonIndex ? { ...lesson, [key]: value } : lesson,
                ),
              }
            : section,
        ),
      }));
    },
    [updateForm],
  );

  // SECTION 4: Unsaved changes guard.
  const isDirty = useMemo(() => isCourseFormDirty(form, baseForm), [baseForm, form]);
  const { confirmLeave } = useUnsavedChangesGuard(isDirty);

  // SECTION 5: Save mutation.
  const saveMutation = useMutation({
    mutationFn: async (validatedForm: CourseFormState) => {
      const metadataPayload = buildCoursePayload(validatedForm);
      const curriculumSectionsPayload = buildCurriculumPayloadSections(validatedForm);

      if (isEditing) {
        if (validCourseId === null) {
          throw new Error("ID course tidak valid untuk proses update");
        }

        return upsertAdminCourseCurriculum(validCourseId, {
          course: metadataPayload,
          sections: curriculumSectionsPayload,
        });
      }

      const createdCourse = await createAdminCourse(metadataPayload);

      if (curriculumSectionsPayload.length > 0) {
        await upsertAdminCourseCurriculum(createdCourse.id, {
          sections: curriculumSectionsPayload,
        });
      }

      return createdCourse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "courses"] });
      if (validCourseId !== null) {
        queryClient.invalidateQueries({ queryKey: ["admin", "courses", "curriculum", validCourseId] });
      }

      toast.success(isEditing ? "Course & kurikulum berhasil diperbarui" : "Course & kurikulum berhasil ditambahkan");
      router.push("/admin/master-data/courses");
      router.refresh();
    },
    onError: (error) => {
      const nextErrors = mapApiError(error);
      setFormErrors(nextErrors);
      toast.error(nextErrors[FORM_ERROR_KEY] ?? "Gagal menyimpan data course");
    },
  });

  // SECTION 6: Actions.
  const handleSave = () => {
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
    saveMutation.mutate(form);
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

  // SECTION 7: Guard states.
  if (isEditing && validCourseId === null) {
    return (
      <section className="space-y-5">
        <AdminPageHeader title="Edit Course" description="ID course tidak valid." />
        <Card className="border border-red-200 bg-red-50 shadow-sm">
          <CardContent className="space-y-3 p-5">
            <p className="text-sm text-red-700">ID course tidak valid untuk proses edit.</p>
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
        <AdminPageHeader title="Edit Course" description="Memuat detail course dan kurikulum..." />
        <Card className="border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-sm">
          <CardContent className="flex items-center gap-2 p-5 text-sm text-[var(--admin-muted-foreground)]">
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
          title="Edit Course"
          description="Data course tidak dapat dimuat. Coba kembali ke daftar course."
        />
        <Card className="border border-red-200 bg-red-50 shadow-sm">
          <CardContent className="space-y-3 p-5">
            <p className="text-sm text-red-700">Gagal memuat data course untuk proses edit.</p>
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
        title={isEditing ? "Edit Course" : "Buat Course"}
        description="Isi data utama course sekaligus struktur section dan lesson dalam satu alur."
      />

      <Card className="border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-sm">
        <CardHeader className="border-b border-[var(--admin-border)] p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-[var(--admin-foreground)]">
                {isEditing ? "Perbarui Course & Kurikulum" : "Tambah Course & Kurikulum"}
              </CardTitle>
              <p className="mt-1 text-sm text-[var(--admin-muted-foreground)]">
                Satu halaman untuk metadata course, section, dan lesson.
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
            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>{getFieldError(FORM_ERROR_KEY)}</span>
            </div>
          ) : null}

          <section className="space-y-4 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-soft)] p-4">
            <h3 className="text-sm font-semibold text-[var(--admin-foreground)]">Informasi Utama Course</h3>

            {isReferenceLoading ? (
              <div className="flex items-center gap-2 rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-2 text-xs text-[var(--admin-muted-foreground)]">
                <Loader2 className="size-3.5 animate-spin" />
                Memuat data kategori dan instructor...
              </div>
            ) : null}

            {isReferenceError ? (
              <div className="flex items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
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
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="course-title">Judul Course</Label>
                <Input
                  id="course-title"
                  value={form.title}
                  onChange={(event) => updateField("title", event.target.value)}
                  className="border-[var(--admin-border)] bg-[var(--admin-surface)]"
                />
                {getFieldError("title") ? <p className="text-xs text-red-600">{getFieldError("title")}</p> : null}
              </div>

              <div className="space-y-1.5">
                <Label>Kategori</Label>
                <Select
                  value={form.category_id || undefined}
                  onValueChange={(value) => updateField("category_id", value ?? "")}
                  disabled={isReferenceLoading || isReferenceError}
                >
                  <SelectTrigger className="h-9 w-full border-[var(--admin-border)] bg-[var(--admin-surface)]">
                    <SelectValue placeholder="Pilih kategori">{selectedCategoryLabel}</SelectValue>
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
                  value={form.instructor_id || undefined}
                  onValueChange={(value) => updateField("instructor_id", value ?? "")}
                  disabled={isReferenceLoading || isReferenceError}
                >
                  <SelectTrigger className="h-9 w-full border-[var(--admin-border)] bg-[var(--admin-surface)]">
                    <SelectValue placeholder="Pilih instructor">{selectedInstructorLabel}</SelectValue>
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

              <div className="space-y-1.5">
                <Label htmlFor="course-price">Harga</Label>
                <Input
                  id="course-price"
                  type="number"
                  min={0}
                  value={form.price}
                  onChange={(event) => updateField("price", event.target.value)}
                  className="border-[var(--admin-border)] bg-[var(--admin-surface)]"
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
                  className="border-[var(--admin-border)] bg-[var(--admin-surface)]"
                />
                {getFieldError("discount_price") ? (
                  <p className="text-xs text-red-600">{getFieldError("discount_price")}</p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label>Status Publish</Label>
                <Select value={form.status} onValueChange={(value) => updateField("status", value as CourseFormState["status"])}>
                  <SelectTrigger className="h-9 w-full border-[var(--admin-border)] bg-[var(--admin-surface)]">
                    <SelectValue placeholder="Pilih status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="course-description">Deskripsi</Label>
                <Textarea
                  id="course-description"
                  rows={3}
                  value={form.description}
                  onChange={(event) => updateField("description", event.target.value)}
                  className="border-[var(--admin-border)] bg-[var(--admin-surface)]"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="course-requirements">Requirements</Label>
                <Textarea
                  id="course-requirements"
                  rows={3}
                  value={form.requirements}
                  onChange={(event) => updateField("requirements", event.target.value)}
                  className="border-[var(--admin-border)] bg-[var(--admin-surface)]"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="course-outcomes">Outcomes</Label>
                <Textarea
                  id="course-outcomes"
                  rows={3}
                  value={form.outcomes}
                  onChange={(event) => updateField("outcomes", event.target.value)}
                  className="border-[var(--admin-border)] bg-[var(--admin-surface)]"
                />
              </div>
            </div>
          </section>

          <section className="space-y-4 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-soft)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-[var(--admin-foreground)]">Struktur Materi (Section & Lesson)</h3>
              <Button type="button" onClick={addSection} className="bg-[var(--admin-brand)] text-white hover:opacity-90">
                <Plus className="size-4" />
                <span>Tambah Section</span>
              </Button>
            </div>

            <p className="text-xs text-[var(--admin-muted-foreground)]">
              Urutan section dan lesson mengikuti posisi daftar dari atas ke bawah.
            </p>

            {form.sections.length === 0 ? (
              <div className="rounded-md border border-dashed border-[var(--admin-border)] bg-[var(--admin-surface)] px-4 py-5 text-center text-sm text-[var(--admin-muted-foreground)]">
                Belum ada section. Klik <span className="font-medium">Tambah Section</span> untuk mulai menyusun materi.
              </div>
            ) : null}

            <div className="space-y-4">
              {form.sections.map((section, sectionIndex) => (
                <div key={section.client_id} className="space-y-3 rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[var(--admin-foreground)]">Section {sectionIndex + 1}</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-red-200 text-red-600 hover:bg-red-50"
                      onClick={() => removeSection(sectionIndex)}
                    >
                      <Trash2 className="size-4" />
                      <span>Hapus Section</span>
                    </Button>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor={`section-title-${section.client_id}`}>Judul Section</Label>
                    <Input
                      id={`section-title-${section.client_id}`}
                      value={section.title}
                      onChange={(event) => updateSectionTitle(sectionIndex, event.target.value)}
                      className="border-[var(--admin-border)] bg-[var(--admin-surface)]"
                    />
                    {getFieldError(`sections.${sectionIndex}.title`) ? (
                      <p className="text-xs text-red-600">{getFieldError(`sections.${sectionIndex}.title`)}</p>
                    ) : null}
                  </div>

                  <div className="space-y-3 rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface-soft)] p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold tracking-wide text-[var(--admin-muted-foreground)] uppercase">
                        Lessons
                      </p>
                      <Button type="button" variant="outline" size="sm" onClick={() => addLesson(sectionIndex)}>
                        <Plus className="size-4" />
                        <span>Tambah Lesson</span>
                      </Button>
                    </div>

                    {section.lessons.length === 0 ? (
                      <p className="text-xs text-[var(--admin-muted-foreground)]">Belum ada lesson di section ini.</p>
                    ) : null}

                    {section.lessons.map((lesson, lessonIndex) => (
                      <div key={lesson.client_id} className="space-y-3 rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface)] p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-medium text-[var(--admin-foreground)]">Lesson {lessonIndex + 1}</p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="border-red-200 text-red-600 hover:bg-red-50"
                            onClick={() => removeLesson(sectionIndex, lessonIndex)}
                          >
                            <Trash2 className="size-4" />
                            <span>Hapus Lesson</span>
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          <div className="space-y-1.5 md:col-span-2">
                            <Label htmlFor={`lesson-title-${lesson.client_id}`}>Judul Lesson</Label>
                            <Input
                              id={`lesson-title-${lesson.client_id}`}
                              value={lesson.title}
                              onChange={(event) => updateLessonField(sectionIndex, lessonIndex, "title", event.target.value)}
                              className="border-[var(--admin-border)] bg-[var(--admin-surface)]"
                            />
                            {getFieldError(`sections.${sectionIndex}.lessons.${lessonIndex}.title`) ? (
                              <p className="text-xs text-red-600">
                                {getFieldError(`sections.${sectionIndex}.lessons.${lessonIndex}.title`)}
                              </p>
                            ) : null}
                          </div>

                          <div className="space-y-1.5">
                            <Label>Tipe Lesson</Label>
                            <Select
                              value={lesson.type}
                              onValueChange={(value) =>
                                updateLessonField(sectionIndex, lessonIndex, "type", value as LessonType)
                              }
                            >
                              <SelectTrigger className="h-9 w-full border-[var(--admin-border)] bg-[var(--admin-surface)]">
                                <SelectValue placeholder="Pilih tipe" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="video">Video</SelectItem>
                                <SelectItem value="file">File</SelectItem>
                                <SelectItem value="quiz">Quiz</SelectItem>
                              </SelectContent>
                            </Select>
                            {getFieldError(`sections.${sectionIndex}.lessons.${lessonIndex}.type`) ? (
                              <p className="text-xs text-red-600">
                                {getFieldError(`sections.${sectionIndex}.lessons.${lessonIndex}.type`)}
                              </p>
                            ) : null}
                          </div>

                          <div className="space-y-1.5">
                            <Label htmlFor={`lesson-duration-${lesson.client_id}`}>Durasi (menit / angka)</Label>
                            <Input
                              id={`lesson-duration-${lesson.client_id}`}
                              type="number"
                              min={0}
                              value={lesson.duration}
                              onChange={(event) => updateLessonField(sectionIndex, lessonIndex, "duration", event.target.value)}
                              className="border-[var(--admin-border)] bg-[var(--admin-surface)]"
                            />
                            {getFieldError(`sections.${sectionIndex}.lessons.${lessonIndex}.duration`) ? (
                              <p className="text-xs text-red-600">
                                {getFieldError(`sections.${sectionIndex}.lessons.${lessonIndex}.duration`)}
                              </p>
                            ) : null}
                          </div>

                          <div className="space-y-1.5 md:col-span-2">
                            <Label htmlFor={`lesson-url-${lesson.client_id}`}>URL Materi</Label>
                            <Input
                              id={`lesson-url-${lesson.client_id}`}
                              value={lesson.lesson_url}
                              onChange={(event) =>
                                updateLessonField(sectionIndex, lessonIndex, "lesson_url", event.target.value)
                              }
                              placeholder={lesson.type === "quiz" ? "Opsional untuk quiz" : "https://..."}
                              className="border-[var(--admin-border)] bg-[var(--admin-surface)]"
                            />
                            {getFieldError(`sections.${sectionIndex}.lessons.${lessonIndex}.lesson_url`) ? (
                              <p className="text-xs text-red-600">
                                {getFieldError(`sections.${sectionIndex}.lessons.${lessonIndex}.lesson_url`)}
                              </p>
                            ) : null}
                          </div>

                          <div className="space-y-1.5 md:col-span-2">
                            <Label htmlFor={`lesson-description-${lesson.client_id}`}>Deskripsi Lesson</Label>
                            <Textarea
                              id={`lesson-description-${lesson.client_id}`}
                              rows={2}
                              value={lesson.description}
                              onChange={(event) =>
                                updateLessonField(sectionIndex, lessonIndex, "description", event.target.value)
                              }
                              className="border-[var(--admin-border)] bg-[var(--admin-surface)]"
                            />
                          </div>

                          <label
                            htmlFor={`lesson-preview-${lesson.client_id}`}
                            className="inline-flex items-center gap-2 rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface-soft)] px-3 py-2 text-sm text-[var(--admin-foreground)] md:col-span-2"
                          >
                            <Checkbox
                              id={`lesson-preview-${lesson.client_id}`}
                              checked={lesson.is_preview}
                              onCheckedChange={(checked) =>
                                updateLessonField(sectionIndex, lessonIndex, "is_preview", checked)
                              }
                            />
                            Jadikan lesson ini sebagai preview
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </CardContent>
      </Card>

      <div className="sticky bottom-4 z-20">
        <div className="flex items-center justify-end gap-2 rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface)] p-3 shadow-lg">
          <Button type="button" variant="outline" onClick={handleCancel} disabled={saveMutation.isPending}>
            Batal
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="bg-[var(--admin-brand)] text-white hover:opacity-90"
          >
            {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            <span>{isEditing ? "Simpan Perubahan" : "Simpan Course"}</span>
          </Button>
        </div>
      </div>
    </section>
  );
}
