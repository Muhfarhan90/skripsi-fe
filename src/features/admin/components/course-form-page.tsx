"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Sortable, { type SortableEvent } from "sortablejs";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  ChevronDown,
  CircleHelp,
  FileText,
  GripVertical,
  ImageIcon,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import {
  createAdminCourseAssignment,
  createAdminCourseSectionQuiz,
  createAdminCourse,
  createAdminSkill,
  createAdminSection,
  createEmptyAdminPaginationMeta,
  deleteAdminCourseReview,
  deleteAdminQuiz,
  deleteAdminLesson,
  getAdminCourseAssignments,
  getAdminCategories,
  getAdminCourseCurriculum,
  getAdminCourseQuizzes,
  getAdminSkills,
  getAdminUsers,
  listAdminCourseReviews,
  upsertAdminCourseCurriculum,
  updateAdminCourse,
  updateAdminCourseAssignment,
  updateAdminCourseSectionQuiz,
  type AdminAssignment,
  type AdminCourseReview,
  type AdminQuiz,
  type AdminCourseCurriculum,
  type AdminSkill,
  type CoursePayload,
  type CourseCurriculumSectionPayload,
} from "@/features/admin/api/master-api";
import { useUnsavedChangesGuard } from "@/features/admin/hooks/use-unsaved-changes-guard";
import { AdminModal } from "@/features/admin/components/admin-modal";
import { AdminOfferingForumPanel } from "@/features/admin/components/admin-offering-forum-panel";
import { AdminPagination } from "@/features/admin/components/admin-pagination";
import { ApiError } from "@/lib/api/client";
import { useAuthStore } from "@/features/auth/store/auth-store";
import { resolvePublicFileUrl } from "@/lib/file-url";
import { SkillMultiSelect } from "@/features/admin/components/skill-multi-select";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/features/admin/lib/offering-utils";

type CourseFormMode = "create" | "edit";
type LessonType = "video" | "file";
type SectionContentType = "lesson" | "quiz" | "assignment";

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
  skill_ids: string[];
  thumbnail: File | string | null;
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
  open_at: string;
  close_at: string;
  is_active: boolean;
  is_random: boolean;
}

interface AssignmentFormState {
  section_id: string;
  title: string;
  description: string;
  instructions: string;
  due_at: string;
  is_required_for_certificate: boolean;
  allow_resubmission: boolean;
  max_attempts: string;
  status: "draft" | "published" | "archived";
}

type CourseFormErrors = Record<string, string>;
type CourseWizardStep = "general" | "curriculum" | "forum" | "reviews";

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
const LESSON_GROUP_CARD_CLASSNAME = "border-sky-200/80 bg-sky-50/40";
const QUIZ_GROUP_CARD_CLASSNAME = "border-amber-200/80 bg-amber-50/40";
const ASSIGNMENT_GROUP_CARD_CLASSNAME = "border-emerald-200/80 bg-emerald-50/40";
const LESSON_ITEM_CARD_CLASSNAME = "border-sky-200/80 bg-sky-50/90 hover:bg-sky-100/90";
const QUIZ_ITEM_CARD_CLASSNAME = "border-amber-200/80 bg-amber-50/90 hover:bg-amber-100/90";
const ASSIGNMENT_ITEM_CARD_CLASSNAME = "border-emerald-200/80 bg-emerald-50/90 hover:bg-emerald-100/90";
const SECTION_CONTENT_OPTIONS = [
  {
    type: "lesson",
    label: "Lesson",
    description: "Tambah materi video atau file untuk section ini.",
    icon: BookOpen,
    iconClassName: "bg-sky-100 text-sky-700 ring-sky-200",
    cardClassName: "border-sky-200/80 bg-sky-50/90 hover:bg-sky-100/90",
  },
  {
    type: "quiz",
    label: "Quiz",
    description: "Buat evaluasi singkat dengan durasi dan passing score.",
    icon: CircleHelp,
    iconClassName: "bg-amber-100 text-amber-700 ring-amber-200",
    cardClassName: "border-amber-200/80 bg-amber-50/90 hover:bg-amber-100/90",
  },
  {
    type: "assignment",
    label: "Assignment",
    description: "Tambahkan tugas dengan due date dan aturan submit.",
    icon: FileText,
    iconClassName: "bg-emerald-100 text-emerald-700 ring-emerald-200",
    cardClassName: "border-emerald-200/80 bg-emerald-50/90 hover:bg-emerald-100/90",
  },
] satisfies Array<{
  type: SectionContentType;
  label: string;
  description: string;
  icon: typeof BookOpen;
  iconClassName: string;
  cardClassName: string;
}>;

const DEFAULT_FORM: CourseFormState = {
  title: "",
  category_id: "",
  instructor_id: "",
  skill_ids: [],
  thumbnail: null,
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
  open_at: "",
  close_at: "",
  is_active: true,
  is_random: false,
};

const DEFAULT_ASSIGNMENT_FORM: AssignmentFormState = {
  section_id: "",
  title: "",
  description: "",
  instructions: "",
  due_at: "",
  is_required_for_certificate: true,
  allow_resubmission: true,
  max_attempts: "",
  status: "published",
};

const COURSE_WIZARD_STEPS: CourseWizardStepItem[] = [
  {
    key: "general",
    label: "General Info",
    description: "Judul, kategori, instructor, skill badge, dan deskripsi utama.",
  },
  {
    key: "curriculum",
    label: "Curriculum",
    description: "Atur section, lesson, quiz, dan assignment per section.",
  },
];

const courseMetadataKeys: Array<Exclude<keyof CourseFormState, "sections">> = [
  "title",
  "category_id",
  "instructor_id",
  "thumbnail",
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

const courseFormSchema = z.object({
  title: z.string().trim().min(1, "Judul course wajib diisi"),
  category_id: z.string().trim().min(1, "Kategori wajib dipilih"),
  instructor_id: z.string().trim().min(1, "Instructor wajib dipilih"),
  skill_ids: z.array(z.string()),
  description: z.string(),
  requirements: z.string(),
  outcomes: z.string(),
  sections: z.array(sectionSchema),
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
    skill_ids: curriculum.skills.map((skill) => String(skill.id)),
    thumbnail: curriculum.thumbnail ?? null,
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
    ...(form.thumbnail instanceof File ? { thumbnail: form.thumbnail } : {}),
    skill_ids: form.skill_ids
      .map((skillId) => Number(skillId))
      .filter((skillId) => Number.isInteger(skillId) && skillId > 0),
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

function buildAutosaveCoursePayload(form: CourseFormState): Partial<CoursePayload> {
  const payload: Partial<CoursePayload> = {
    skill_ids: form.skill_ids
      .map((skillId) => Number(skillId))
      .filter((skillId) => Number.isInteger(skillId) && skillId > 0),
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

function toApiDateTimeOrNull(value: string): string | null {
  const normalized = value.trim();
  if (!normalized) return null;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return null;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day} ${hour}:${minute}:00`;
}

function toDateTimeLocalInput(value?: string | null): string {
  if (!value) return "";
  const normalized = value.trim().replace(" ", "T");
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(normalized)) {
    return normalized.slice(0, 16);
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function parsePositiveIntegerOrNull(raw: string): number | null {
  const normalized = raw.trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (!Number.isInteger(parsed) || parsed < 1) return null;
  return parsed;
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

function formatQuizWindowLabel(openAt?: string | null, closeAt?: string | null): string {
  if (!openAt && !closeAt) return "Window: selalu terbuka";
  if (openAt && !closeAt) return `Buka: ${openAt}`;
  if (!openAt && closeAt) return `Tutup: ${closeAt}`;
  return `Buka: ${openAt} | Tutup: ${closeAt}`;
}

function formatAssignmentDueLabel(dueAt?: string | null): string {
  if (!dueAt) return "Tanpa deadline";
  return `Deadline: ${dueAt}`;
}

function getSectionDisplayLabel(section: Pick<SectionFormState, "title">, fallbackIndex?: number): string {
  const title = section.title.trim();
  if (title) return title;
  if (typeof fallbackIndex === "number") return `Section ${fallbackIndex + 1}`;
  return "Section tanpa judul";
}

function getStepIndexFromParam(stepParam: string | null): number {
  if (stepParam === "curriculum") return 1;
  return 0;
}

function haveSameSkillSelection(currentSkillIds: string[], baseSkillIds: string[]): boolean {
  if (currentSkillIds.length !== baseSkillIds.length) {
    return false;
  }

  return currentSkillIds.every((skillId, index) => skillId === baseSkillIds[index]);
}

function isCourseFormDirty(currentForm: CourseFormState, baseForm: CourseFormState): boolean {
  if (courseMetadataKeys.some((key) => currentForm[key] !== baseForm[key])) {
    return true;
  }

  if (!haveSameSkillSelection(currentForm.skill_ids, baseForm.skill_ids)) {
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
  const user = useAuthStore((state) => state.user);
  const router = useRouter();
  const pathname = usePathname();
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
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [editingAssignmentId, setEditingAssignmentId] = useState<number | null>(null);
  const [assignmentForm, setAssignmentForm] = useState<AssignmentFormState>(DEFAULT_ASSIGNMENT_FORM);
  const [confirmDeleteQuiz, setConfirmDeleteQuiz] = useState<AdminQuiz | null>(null);
  const [confirmDeleteSection, setConfirmDeleteSection] = useState<SectionDeleteTarget | null>(null);
  const [confirmDeleteLesson, setConfirmDeleteLesson] = useState<LessonDeleteTarget | null>(null);
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewToDelete, setReviewToDelete] = useState<AdminCourseReview | null>(null);
  const [contentPopoverSectionKey, setContentPopoverSectionKey] = useState<string | null>(null);
  const requestedStep = searchParams.get("step");
  const [activeStepIndex, setActiveStepIndex] = useState<number>(() =>
    getStepIndexFromParam(searchParams.get("step")),
  );
  const highlightedForumPostId = parsePositiveIntegerOrNull(searchParams.get("forumPostId") ?? "");
  const highlightedReviewId = parsePositiveIntegerOrNull(searchParams.get("reviewId") ?? "");
  const [lastAutosavedAt, setLastAutosavedAt] = useState<Date | null>(null);
  const [autosaveErrorMessage, setAutosaveErrorMessage] = useState<string | null>(null);
  const sectionListRef = useRef<HTMLDivElement | null>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAutosavedFingerprintRef = useRef<string>("");

  // SECTION 2: Reference data and curriculum detail.
  const categoryQuery = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: () => getAdminCategories(),
  });

  const userQuery = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => getAdminUsers({ role_group: "instructors" }),
  });

  const skillQuery = useQuery({
    queryKey: ["admin", "skills", "options"],
    queryFn: () => getAdminSkills(),
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

  const courseAssignmentsQuery = useQuery({
    queryKey: ["admin", "courses", "assignments", validCourseId],
    queryFn: () => {
      if (validCourseId === null) {
        throw new Error("ID course tidak valid");
      }
      return getAdminCourseAssignments(validCourseId);
    },
    enabled: isEditing && validCourseId !== null,
  });

  const courseReviewsQuery = useQuery({
    queryKey: ["admin", "courses", "reviews", validCourseId, reviewPage],
    queryFn: () => {
      if (validCourseId === null) {
        throw new Error("ID course tidak valid");
      }
      return listAdminCourseReviews(validCourseId, { page: reviewPage });
    },
    enabled: isEditing && validCourseId !== null && activeStepIndex === 3,
  });

  // SECTION 3: Base form source and updater helpers.
  const baseForm = useMemo<CourseFormState>(() => {
    if (isEditing && curriculumQuery.data) {
      return mapCurriculumToFormState(curriculumQuery.data);
    }
    if (user && user.role_name === "instructor") {
      return {
        ...DEFAULT_FORM,
        instructor_id: String(user.id),
      };
    }
    return DEFAULT_FORM;
  }, [curriculumQuery.data, isEditing, user]);

  const form = draftForm ?? baseForm;
  const autosaveFingerprint = useMemo(() => JSON.stringify(form), [form]);
  const thumbnailPreviewUrl = useMemo(() => {
    const thumbnail = form.thumbnail;
    if (!thumbnail) return null;
    if (thumbnail instanceof File) return URL.createObjectURL(thumbnail);
    return resolvePublicFileUrl(thumbnail) ?? thumbnail;
  }, [form.thumbnail]);
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
  const selectedSkillLabels = useMemo(() => {
    const skillMap = new Map((skillQuery.data ?? []).map((skill) => [String(skill.id), skill.name]));

    return form.skill_ids
      .map((skillId) => skillMap.get(skillId))
      .filter((label): label is string => Boolean(label));
  }, [form.skill_ids, skillQuery.data]);

  useEffect(() => {
    if (!(form.thumbnail instanceof File) || !thumbnailPreviewUrl) {
      return;
    }

    return () => URL.revokeObjectURL(thumbnailPreviewUrl);
  }, [form.thumbnail, thumbnailPreviewUrl]);
  const selectedQuizSectionLabel = useMemo(() => {
    if (!quizForm.section_id) return undefined;

    const sectionIndex = form.sections.findIndex((section) => String(section.id ?? "") === quizForm.section_id);
    if (sectionIndex < 0) return "Section tidak ditemukan";

    return getSectionDisplayLabel(form.sections[sectionIndex], sectionIndex);
  }, [form.sections, quizForm.section_id]);
  const selectedAssignmentSectionLabel = useMemo(() => {
    if (!assignmentForm.section_id) return undefined;

    const sectionIndex = form.sections.findIndex((section) => String(section.id ?? "") === assignmentForm.section_id);
    if (sectionIndex < 0) return "Section tidak ditemukan";

    return getSectionDisplayLabel(form.sections[sectionIndex], sectionIndex);
  }, [assignmentForm.section_id, form.sections]);
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
  const assignmentsBySectionId = useMemo(() => {
    return (courseAssignmentsQuery.data ?? []).reduce<Map<number, AdminAssignment[]>>((acc, assignment) => {
      const sectionId = Number(assignment.section_id ?? 0);
      if (!sectionId) return acc;
      const current = acc.get(sectionId) ?? [];
      current.push(assignment);
      acc.set(sectionId, current);
      return acc;
    }, new Map());
  }, [courseAssignmentsQuery.data]);
  const courseReviewRows = courseReviewsQuery.data?.items ?? [];
  const courseReviewMeta = courseReviewsQuery.data?.meta ?? createEmptyAdminPaginationMeta(reviewPage);

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

  useEffect(() => {
    if (!isEditing || validCourseId === null) {
      return;
    }

    if (requestedStep === "forum") {
      const nextParams = new URLSearchParams();
      nextParams.set("courseId", String(validCourseId));
      if (highlightedForumPostId) {
        nextParams.set("forumPostId", String(highlightedForumPostId));
      }

      router.replace(`/admin/course-activity/forum?${nextParams.toString()}`, { scroll: false });
      return;
    }

    if (requestedStep === "reviews") {
      const nextParams = new URLSearchParams();
      nextParams.set("courseId", String(validCourseId));
      if (highlightedReviewId) {
        nextParams.set("reviewId", String(highlightedReviewId));
      }

      router.replace(`/admin/course-reviews?${nextParams.toString()}`, { scroll: false });
    }
  }, [
    highlightedForumPostId,
    highlightedReviewId,
    isEditing,
    requestedStep,
    router,
    validCourseId,
  ]);

  // SECTION 5: Save mutation.
  const saveMutation = useMutation({
    mutationFn: async ({
      submittedForm,
      includeSections,
    }: {
      submittedForm: CourseFormState;
      includeSections: boolean;
    }) => {
      const curriculumSectionsPayload = includeSections ? buildCurriculumPayloadSections(submittedForm) : undefined;
      const coursePayload = buildCoursePayload(submittedForm);
      const { thumbnail: thumbnailPayload, ...courseMetadataPayload } = coursePayload;

      if (isEditing) {
        if (validCourseId === null) {
          throw new Error("ID course tidak valid untuk proses update");
        }

        // 1. Selalu perbarui metadata course utama terlebih dahulu (termasuk thumbnail)
        await updateAdminCourse(validCourseId, coursePayload);

        // 2. Kemudian simpan/perbarui data curriculum (sections & lessons)
        const updatedCurriculum = await upsertAdminCourseCurriculum(validCourseId, {
          ...(includeSections ? { sections: curriculumSectionsPayload ?? [] } : {}),
        });

        return updatedCurriculum;
      }

      const createdCourse = await createAdminCourse(coursePayload);

      if (includeSections && (curriculumSectionsPayload?.length ?? 0) > 0) {
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

      const successMessage = isEditing ? "Course master berhasil diperbarui" : "Course master berhasil dibuat";
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

  const initializeCourseMutation = useMutation({
    mutationFn: async (nextStepIndex: number) => {
      if (isEditing) {
        throw new Error("Course sudah tersedia dan tidak perlu diinisialisasi ulang.");
      }

      const createdCourse = await createAdminCourse(buildCoursePayload(form));
      return {
        createdCourse,
        nextStepIndex,
      };
    },
    onSuccess: ({ createdCourse, nextStepIndex }) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "courses"] });
      const nextStepKey = COURSE_WIZARD_STEPS[nextStepIndex]?.key ?? "curriculum";
      router.replace(`/admin/master-data/courses/${createdCourse.id}?step=${nextStepKey}`);
      router.refresh();
    },
    onError: (error) => {
      const nextErrors = mapApiError(error);
      setFormErrors(nextErrors);
      toast.error(nextErrors[FORM_ERROR_KEY] ?? "Gagal menyiapkan course untuk lanjut ke curriculum");
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
        course: buildAutosaveCoursePayload(submittedForm),
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

  const createSkillMutation = useMutation({
    mutationFn: async (name: string) => {
      const normalizedName = name.trim();
      if (!normalizedName) {
        throw new Error("Nama skill wajib diisi");
      }

      return createAdminSkill({
        name: normalizedName,
        is_active: true,
      });
    },
    onSuccess: (createdSkill) => {
      queryClient.setQueryData<AdminSkill[]>(["admin", "skills", "options"], (current) => {
        const skills = current ?? [];
        if (skills.some((skill) => skill.id === createdSkill.id)) {
          return skills;
        }

        return [...skills, createdSkill].sort((left, right) => left.name.localeCompare(right.name));
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "skills"] });
      toast.success("Skill baru berhasil ditambahkan");
    },
    onError: (error) => {
      toast.error(normalizeError(error));
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

  const resetAssignmentForm = useCallback(() => {
    setEditingAssignmentId(null);
    setAssignmentForm(DEFAULT_ASSIGNMENT_FORM);
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

      if (quizForm.open_at && quizForm.close_at && new Date(quizForm.close_at) < new Date(quizForm.open_at)) {
        throw new Error("Waktu tutup quiz harus lebih besar atau sama dengan waktu buka quiz");
      }

      if (editingQuizId) {
        return updateAdminCourseSectionQuiz(validCourseId, Number(quizForm.section_id), editingQuizId, {
          title: quizForm.title.trim(),
          description: quizForm.description.trim() || null,
          duration: toNonNegativeNumberOrZero(quizForm.duration),
          passing_score: toNonNegativeNumberOrZero(quizForm.passing_score),
          weight: toNonNegativeNumberOrZero(quizForm.weight),
          max_attempts: toNonNegativeNumberOrZero(quizForm.max_attempts),
          open_at: toApiDateTimeOrNull(quizForm.open_at),
          close_at: toApiDateTimeOrNull(quizForm.close_at),
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
        open_at: toApiDateTimeOrNull(quizForm.open_at),
        close_at: toApiDateTimeOrNull(quizForm.close_at),
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

  const deleteReviewMutation = useMutation({
    mutationFn: (reviewId: number) => {
      if (validCourseId === null) {
        throw new Error("ID course tidak valid");
      }
      return deleteAdminCourseReview(validCourseId, reviewId);
    },
    onSuccess: (message) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "courses", "reviews", validCourseId] });
      toast.success(message || "Review berhasil dihapus");
      setReviewToDelete(null);
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

  const saveAssignmentMutation = useMutation({
    mutationFn: async () => {
      if (validCourseId === null) {
        throw new Error("ID course tidak valid");
      }

      if (!assignmentForm.section_id || !assignmentForm.title.trim()) {
        throw new Error("Section dan judul assignment wajib diisi");
      }

      if (assignmentForm.max_attempts.trim() && parsePositiveIntegerOrNull(assignmentForm.max_attempts) === null) {
        throw new Error("Max attempts harus bilangan bulat minimal 1");
      }

      const payload = {
        section_id: Number(assignmentForm.section_id),
        title: assignmentForm.title.trim(),
        description: assignmentForm.description.trim() || null,
        instructions: assignmentForm.instructions.trim() || null,
        due_at: toApiDateTimeOrNull(assignmentForm.due_at),
        is_required_for_certificate: assignmentForm.is_required_for_certificate,
        allow_resubmission: assignmentForm.allow_resubmission,
        max_attempts: parsePositiveIntegerOrNull(assignmentForm.max_attempts),
        status: assignmentForm.status,
      } as const;

      if (editingAssignmentId) {
        return updateAdminCourseAssignment(validCourseId, editingAssignmentId, payload);
      }

      return createAdminCourseAssignment(validCourseId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "courses", "assignments", validCourseId] });
      toast.success(editingAssignmentId ? "Assignment berhasil diperbarui" : "Assignment berhasil ditambahkan");
      setAssignmentModalOpen(false);
      resetAssignmentForm();
    },
    onError: (error) => {
      toast.error(normalizeError(error));
    },
  });

  const closeAssignmentModal = useCallback(() => {
    if (saveAssignmentMutation.isPending) return;
    setAssignmentModalOpen(false);
    resetAssignmentForm();
  }, [resetAssignmentForm, saveAssignmentMutation.isPending]);

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
      toast.error("Section belum tersimpan. Simpan course dulu sebelum menambah lesson.");
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
      toast.error("Lesson belum tersimpan. Simpan course dulu sebelum mengubah lesson.");
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
      toast.error("Section belum tersimpan. Simpan course dulu sebelum menambah quiz.");
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

  const openCreateAssignmentModal = (sectionId?: number) => {
    if (validCourseId === null || !sectionId) {
      toast.error("Section belum tersimpan. Simpan course dulu sebelum menambah assignment.");
      return;
    }

    if (!canManageQuizzes) {
      toast.error("Simpan course dulu sebelum mengelola assignment.");
      return;
    }

    setEditingAssignmentId(null);
    setAssignmentForm({
      ...DEFAULT_ASSIGNMENT_FORM,
      section_id: String(sectionId),
    });
    setAssignmentModalOpen(true);
  };

  const handleSelectSectionContentType = (sectionId: number | undefined, type: SectionContentType) => {
    setContentPopoverSectionKey(null);

    if (type === "lesson") {
      openCreateLessonPage(sectionId);
      return;
    }

    if (type === "quiz") {
      openCreateQuizPage(sectionId);
      return;
    }

    openCreateAssignmentModal(sectionId);
  };

  const openEditAssignmentModal = (assignment: AdminAssignment) => {
    if (validCourseId === null) {
      toast.error("ID course tidak valid.");
      return;
    }

    setEditingAssignmentId(assignment.id);
    setAssignmentForm({
      section_id: assignment.section_id ? String(assignment.section_id) : "",
      title: assignment.title ?? "",
      description: assignment.description ?? "",
      instructions: assignment.instructions ?? "",
      due_at: toDateTimeLocalInput(assignment.due_at),
      is_required_for_certificate: Boolean(assignment.is_required_for_certificate),
      allow_resubmission: Boolean(assignment.allow_resubmission),
      max_attempts: assignment.max_attempts ? String(assignment.max_attempts) : "",
      status:
        assignment.status === "draft" || assignment.status === "archived" || assignment.status === "published"
          ? assignment.status
          : "published",
    });
    setAssignmentModalOpen(true);
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

  const handleSaveCourse = () => {
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
      includeSections: true,
    });
  };

  const handleCancel = () => {
    if (!confirmLeave()) return;
    router.push("/admin/master-data/courses");
  };

  const retryReferenceData = () => {
    categoryQuery.refetch();
    userQuery.refetch();
    skillQuery.refetch();
  };

  const getFieldError = (path: string): string | undefined => formErrors[path];
  const currentStep = COURSE_WIZARD_STEPS[activeStepIndex];
  const isFirstStep = activeStepIndex === 0;
  const isLastStep = activeStepIndex === COURSE_WIZARD_STEPS.length - 1;
  const isPrimaryActionPending = saveMutation.isPending || initializeCourseMutation.isPending;
  const autosaveStatusLabel = useMemo(() => {
    return isDirty ? "Perubahan belum disimpan." : "Semua perubahan telah disimpan.";
  }, [isDirty]);

  const clearStepErrors = useCallback((prev: CourseFormErrors, stepIndex: number): CourseFormErrors => {
    const next: CourseFormErrors = { ...prev };

      if (stepIndex === 0) {
        delete next.title;
        delete next.category_id;
        delete next.instructor_id;
        delete next.skill_ids;
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

          section.lessons.forEach((lesson, lessonIndex) => {
            if (!lesson.title.trim()) {
              nextErrors[`sections.${sectionIndex}.lessons.${lessonIndex}.title`] = "Judul lesson wajib diisi";
            }
          });
        });
      }

      setFormErrors((prev) => ({
        ...clearStepErrors(prev, stepIndex),
        ...nextErrors,
      }));

      if (nextErrors[FORM_ERROR_KEY]) {
        toast.error(nextErrors[FORM_ERROR_KEY]);
      }

      return Object.keys(nextErrors).length === 0;
    },
    [clearStepErrors, form],
  );

  const goToStep = (nextStepIndex: number) => {
    if (initializeCourseMutation.isPending) return;
    if (nextStepIndex === activeStepIndex) return;
    if (nextStepIndex < 0 || nextStepIndex >= COURSE_WIZARD_STEPS.length) return;

    const setActiveCourseStep = (stepIndex: number) => {
      const nextStepKey = COURSE_WIZARD_STEPS[stepIndex]?.key ?? "general";
      const nextParams = new URLSearchParams(searchParams.toString());

      if (nextStepKey === "general") {
        nextParams.delete("step");
      } else {
        nextParams.set("step", nextStepKey);
      }

      if (nextStepKey !== "forum") {
        nextParams.delete("forumPostId");
      }

      if (nextStepKey !== "reviews") {
        nextParams.delete("reviewId");
      }

      const nextQuery = nextParams.toString();
      setActiveStepIndex(stepIndex);
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    };

    if (nextStepIndex < activeStepIndex) {
      setActiveCourseStep(nextStepIndex);
      return;
    }

    for (let stepIndex = activeStepIndex; stepIndex < nextStepIndex; stepIndex += 1) {
      if (!validateStep(stepIndex)) {
        setActiveCourseStep(stepIndex);
        return;
      }
    }

    if (!isEditing && validCourseId === null && activeStepIndex === 0 && nextStepIndex >= 1) {
      initializeCourseMutation.mutate(nextStepIndex);
      return;
    }

    setActiveCourseStep(nextStepIndex);
  };

  const handleNextStep = () => {
    goToStep(activeStepIndex + 1);
  };

  const handlePrevStep = () => {
    goToStep(activeStepIndex - 1);
  };

  const handleSaveCourseFromAnyStep = () => {
    const stepIndexesToValidate = [0, 1] as const;
    for (const stepIndex of stepIndexesToValidate) {
      if (!validateStep(stepIndex)) {
        const nextStepKey = COURSE_WIZARD_STEPS[stepIndex]?.key ?? "general";
        const nextParams = new URLSearchParams(searchParams.toString());
        if (nextStepKey === "general") {
          nextParams.delete("step");
        } else {
          nextParams.set("step", nextStepKey);
        }
        router.replace(nextParams.toString() ? `${pathname}?${nextParams.toString()}` : pathname, { scroll: false });
        setActiveStepIndex(stepIndex);
        return;
      }
    }
    handleSaveCourse();
  };

  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, []);

  // Autosave dinonaktifkan sesuai permintaan user. Perubahan hanya disimpan saat tombol "Simpan" diklik secara manual.

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

  const isReferenceLoading = categoryQuery.isLoading || userQuery.isLoading || skillQuery.isLoading;
  const isReferenceError = categoryQuery.isError || userQuery.isError || skillQuery.isError;

  return (
    <section className="space-y-5">
      <AdminPageHeader
        title={isEditing ? "Detail Course Master" : "Buat Course Master"}
        description="Kelola course master dengan alur bertahap: General Info lalu Curriculum."
      />

      <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
        <CardHeader className="border-b border-[var(--border)] p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-[var(--foreground)]">
                {isEditing ? "Edit Course Master (Step by Step)" : "Buat Course Master (Step by Step)"}
              </CardTitle>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Isi form per langkah agar manajemen course, kurikulum, dan assessment lebih terstruktur.
              </p>
            </div>

            <Button type="button" variant="outline" onClick={handleCancel}>
              <ArrowLeft className="size-4" />
              <span>Kembali ke Daftar</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 p-5">
          <section className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--muted)] p-4">
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              {COURSE_WIZARD_STEPS.map((step, stepIndex) => {
                const isCurrent = activeStepIndex === stepIndex;
                const isCompleted = activeStepIndex > stepIndex;

                return (
                  <button
                    key={step.key}
                    type="button"
                    onClick={() => goToStep(stepIndex)}
                    disabled={isPrimaryActionPending}
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

          {activeStepIndex === 0 ? (
            <section className="space-y-4 rounded-lg border border-[var(--border)] bg-[var(--muted)] p-4">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">Informasi Utama Course</h3>

            {activeStepIndex === 0 && isReferenceLoading ? (
              <div className="flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs text-[var(--muted-foreground)]">
                <Loader2 className="size-3.5 animate-spin" />
                Memuat data kategori, instructor, dan skill...
              </div>
            ) : null}

            {activeStepIndex === 0 && isReferenceError ? (
              <div className="flex items-center justify-between gap-3 rounded-md border border-[var(--danger-soft-border)] bg-[var(--danger-soft-bg)] px-3 py-2 text-xs text-[var(--danger-soft-foreground)]">
                <span className="inline-flex items-center gap-1.5">
                  <AlertTriangle className="size-3.5" />
                  Gagal memuat referensi kategori/instructor/skill.
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
                      disabled={isReferenceLoading || isReferenceError || user?.role_name === "instructor"}
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
                    <Label>Skill Badge</Label>
                    <SkillMultiSelect
                      skills={skillQuery.data ?? []}
                      value={form.skill_ids}
                      onChange={(value) => updateField("skill_ids", value)}
                      onCreateSkill={(name) => createSkillMutation.mutateAsync(name)}
                      disabled={isReferenceLoading || isReferenceError}
                      isLoading={skillQuery.isLoading || createSkillMutation.isPending}
                      className="w-full"
                    />
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Pilih skill badge untuk course ini. Jika belum ada, buat langsung dari kolom pencarian.
                    </p>
                    {selectedSkillLabels.length > 0 ? (
                      <p className="text-xs text-[var(--muted-foreground)]">
                        Terpilih: {selectedSkillLabels.join(", ")}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="course-thumbnail">Thumbnail Course</Label>
                    <div className="flex flex-col gap-3 rounded-md border border-[var(--border)] bg-[var(--card)] p-3 sm:flex-row sm:items-center">
                      <div className="flex aspect-video w-full max-w-56 items-center justify-center overflow-hidden rounded-md border border-[var(--border)] bg-[var(--muted)] text-[var(--muted-foreground)]">
                        {thumbnailPreviewUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={thumbnailPreviewUrl} alt="Preview thumbnail course" className="h-full w-full object-cover" />
                        ) : (
                          <ImageIcon className="size-8" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1 space-y-2">
                        <Input
                          id="course-thumbnail"
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={(event) => {
                            const file = event.target.files?.[0] ?? null;
                            if (file) {
                              updateField("thumbnail", file);
                            }
                          }}
                          className="border-[var(--border)] bg-[var(--card)]"
                        />
                        <p className="text-xs leading-5 text-[var(--muted-foreground)]">
                          Gunakan gambar rasio 16:9. Format JPG, PNG, atau WebP maksimal 2MB.
                        </p>
                        {form.thumbnail instanceof File ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => updateField("thumbnail", baseForm.thumbnail)}
                            className="h-8"
                          >
                            Batalkan pilihan gambar
                          </Button>
                        ) : null}
                      </div>
                    </div>
                    {getFieldError("thumbnail") ? <p className="text-xs text-red-600">{getFieldError("thumbnail")}</p> : null}
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

            </div>
            </section>
          ) : null}

          {activeStepIndex === 1 ? (
            <section className="space-y-4 rounded-lg border border-[var(--border)] bg-[var(--muted)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-[var(--foreground)]">
                Struktur Materi (Section, Lesson, Quiz, Assignment)
              </h3>
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
              Urutan section, lesson, quiz, dan assignment mengikuti posisi daftar dari atas ke bawah.
            </p>

            {form.sections.length === 0 ? (
              <div className="rounded-md border border-dashed border-[var(--border)] bg-[var(--card)] px-4 py-5 text-center text-sm text-[var(--muted-foreground)]">
                Belum ada section. Klik <span className="font-medium">Tambah Section</span> untuk mulai menyusun materi.
              </div>
            ) : null}

            <div ref={sectionListRef} className="space-y-4">
              {form.sections.map((section, sectionIndex) => {
                const sectionLessons = section.lessons;
                const sectionQuizzes = section.id ? (quizzesBySectionId.get(section.id) ?? []) : [];
                const sectionAssignments = section.id ? (assignmentsBySectionId.get(section.id) ?? []) : [];
                const showLessonsCard = sectionLessons.length > 0;
                const showQuizzesCard =
                  isEditing && validCourseId !== null && (sectionQuizzes.length > 0 || courseQuizzesQuery.isError);
                const showAssignmentsCard =
                  isEditing &&
                  validCourseId !== null &&
                  (sectionAssignments.length > 0 || courseAssignmentsQuery.isError);

                return (
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
                      <Popover
                        open={contentPopoverSectionKey === section.client_id}
                        onOpenChange={(open) => setContentPopoverSectionKey(open ? section.client_id : null)}
                      >
                        <PopoverTrigger
                          type="button"
                          disabled={!canManageQuizzes || !section.id}
                          className={`${buttonVariants({ variant: "outline", size: "sm" })} border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]`}
                        >
                          <Plus className="size-4" />
                          <span>Tambah Konten</span>
                          <ChevronDown className="size-4 text-[var(--muted-foreground)]" />
                        </PopoverTrigger>

                        <PopoverContent
                          align="end"
                          className="w-80 border border-[var(--border)] bg-[var(--card)] p-3 text-[var(--foreground)] shadow-lg"
                        >
                          <div className="space-y-2">
                            <div className="rounded-md border border-[var(--border)] bg-[var(--muted)] px-3 py-2">
                              <p className="text-sm font-semibold">Pilih tipe konten</p>
                              <p className="text-xs text-[var(--muted-foreground)]">
                                Semua item baru akan ditambahkan ke section ini.
                              </p>
                            </div>

                            {SECTION_CONTENT_OPTIONS.map((option) => (
                              <button
                                key={option.type}
                                type="button"
                                onClick={() => handleSelectSectionContentType(section.id, option.type)}
                                className={`flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition ${option.cardClassName}`}
                              >
                                <span
                                  className={`inline-flex size-10 shrink-0 items-center justify-center rounded-xl ring-1 ${option.iconClassName}`}
                                >
                                  <option.icon className="size-5" />
                                </span>
                                <span className="min-w-0">
                                  <span className="block text-sm font-semibold text-[var(--foreground)]">{option.label}</span>
                                  <span className="mt-0.5 block text-xs leading-5 text-[var(--muted-foreground)]">
                                    {option.description}
                                  </span>
                                </span>
                              </button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>

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

                  {showLessonsCard ? (
                    <div className={`space-y-3 rounded-md border p-3 ${LESSON_GROUP_CARD_CLASSNAME}`}>
                      <p className="text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                        Lessons
                      </p>

                    <div data-lesson-sortable="true" data-section-index={sectionIndex} className="space-y-2">
                      {sectionLessons.map((lesson, lessonIndex) => (
                        <div
                          key={lesson.client_id}
                          data-lesson-draggable="true"
                          className={`flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 transition ${LESSON_ITEM_CARD_CLASSNAME}`}
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
                  ) : null}

                  {showQuizzesCard ? (
                    <div className={`space-y-3 rounded-md border p-3 ${QUIZ_GROUP_CARD_CLASSNAME}`}>
                      <p className="text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                        Quizzes
                      </p>

                      {courseQuizzesQuery.isError ? (
                        <p className="text-xs text-red-600">Gagal memuat quiz. Coba refresh halaman.</p>
                      ) : (
                        <div className="space-y-2">
                          {sectionQuizzes.map((quiz) => (
                            <div
                              key={quiz.id}
                              className={`flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 transition ${QUIZ_ITEM_CARD_CLASSNAME}`}
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
                                <p className="text-xs text-[var(--muted-foreground)]">
                                  {formatQuizWindowLabel(quiz.open_at, quiz.close_at)}
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
                      )}
                    </div>
                  ) : null}

                  {showAssignmentsCard ? (
                    <div className={`space-y-3 rounded-md border p-3 ${ASSIGNMENT_GROUP_CARD_CLASSNAME}`}>
                      <p className="text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                        Assignments
                      </p>

                      {courseAssignmentsQuery.isError ? (
                        <p className="text-xs text-red-600">Gagal memuat assignment. Coba refresh halaman.</p>
                      ) : (
                        <div className="space-y-2">
                          {sectionAssignments.map((assignment) => (
                            <div
                              key={assignment.id}
                              className={`flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 transition ${ASSIGNMENT_ITEM_CARD_CLASSNAME}`}
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-[var(--foreground)]">
                                  {assignment.title ?? `Assignment #${assignment.id}`}
                                </p>
                                <p className="text-xs text-[var(--muted-foreground)]">
                                  {assignment.is_required_for_certificate ? "Wajib Sertifikat" : "Opsional"} |{" "}
                                  {assignment.allow_resubmission ? "Boleh resubmit" : "Tidak boleh resubmit"} | Maks{" "}
                                  {assignment.max_attempts ?? "-"}x
                                </p>
                                <p className="text-xs text-[var(--muted-foreground)]">
                                  {formatAssignmentDueLabel(assignment.due_at)}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon-sm"
                                  onClick={() => openEditAssignmentModal(assignment)}
                                  disabled={!canManageQuizzes}
                                  className="border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]"
                                  aria-label={`Edit assignment ${assignment.title ?? assignment.id}`}
                                >
                                  <Pencil className="size-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
                );
              })}
            </div>
            </section>
          ) : null}

          {activeStepIndex === 2 ? (
            <section className="space-y-4 rounded-lg border border-[var(--border)] bg-[var(--muted)] p-4">
              {isEditing && validCourseId !== null ? (
                <AdminOfferingForumPanel
                  courseId={validCourseId}
                  courseTitle={form.title || "Course"}
                  initialPostId={highlightedForumPostId}
                />
              ) : (
                <div className="rounded-md border border-dashed border-[var(--border)] bg-[var(--card)] px-4 py-5 text-center text-sm text-[var(--muted-foreground)]">
                  Simpan course terlebih dahulu sebelum membuka forum.
                </div>
              )}
            </section>
          ) : null}

          {activeStepIndex === 3 ? (
            <section className="space-y-4 rounded-lg border border-[var(--border)] bg-[var(--muted)] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
                    <Star className="size-4 text-amber-500" />
                    <span>Reviews Course</span>
                  </h3>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                    Pantau rating dan ulasan student untuk course ini.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => courseReviewsQuery.refetch()}
                  disabled={courseReviewsQuery.isFetching}
                  className="border-[var(--border)] bg-[var(--card)]"
                >
                  {courseReviewsQuery.isFetching ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <RefreshCw className="size-4" />
                  )}
                  <span>Refresh</span>
                </Button>
              </div>

              {!isEditing || validCourseId === null ? (
                <div className="rounded-md border border-dashed border-[var(--border)] bg-[var(--card)] px-4 py-5 text-center text-sm text-[var(--muted-foreground)]">
                  Simpan course terlebih dahulu sebelum membuka reviews.
                </div>
              ) : null}

              {isEditing && validCourseId !== null && courseReviewsQuery.isLoading ? (
                <div className="flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--card)] px-4 py-4 text-sm text-[var(--muted-foreground)]">
                  <Loader2 className="size-4 animate-spin" />
                  Memuat review course...
                </div>
              ) : null}

              {isEditing && validCourseId !== null && courseReviewsQuery.isError ? (
                <div className="rounded-md border border-[var(--danger-soft-border)] bg-[var(--danger-soft-bg)] px-4 py-4 text-sm text-[var(--danger-soft-foreground)]">
                  Review course belum bisa dimuat.
                </div>
              ) : null}

              {isEditing &&
              validCourseId !== null &&
              courseReviewsQuery.isSuccess &&
              courseReviewRows.length === 0 ? (
                <div className="rounded-md border border-dashed border-[var(--border)] bg-[var(--card)] px-4 py-8 text-center text-sm text-[var(--muted-foreground)]">
                  Belum ada review untuk course ini.
                </div>
              ) : null}

              {courseReviewRows.length > 0 ? (
                <div className="space-y-3">
                  {courseReviewRows.map((review) => {
                    const isHighlighted = highlightedReviewId === review.id;
                    const reviewerName = review.user?.fullname ?? `Student #${review.user_id}`;
                    const reviewerEmail = review.user?.email ?? null;

                    return (
                      <div
                        key={review.id}
                        className={[
                          "rounded-md border bg-[var(--card)] p-4",
                          isHighlighted ? "border-[var(--primary)] ring-2 ring-[var(--primary)]/15" : "border-[var(--border)]",
                        ].join(" ")}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[var(--foreground)]">{reviewerName}</p>
                            {reviewerEmail ? (
                              <p className="text-xs text-[var(--muted-foreground)]">{reviewerEmail}</p>
                            ) : null}
                            <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-amber-600">
                              <Star className="size-3.5 fill-current" />
                              <span>{review.rating}/5</span>
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-[var(--muted-foreground)]">
                              {formatDateTime(review.created_at)}
                            </span>
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon-sm"
                              onClick={() => setReviewToDelete(review)}
                              className="border-[var(--danger-soft-border)] bg-[var(--danger-soft-bg)] text-[var(--danger-soft-foreground)] hover:opacity-90"
                              aria-label={`Hapus review ${reviewerName}`}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </div>
                        <p className="mt-3 whitespace-pre-line text-sm leading-6 text-[var(--muted-foreground)]">
                          {review.review?.trim() || "Tidak ada komentar tertulis."}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : null}

              {courseReviewMeta.total > 0 ? (
                <AdminPagination
                  meta={courseReviewMeta}
                  isLoading={courseReviewsQuery.isLoading}
                  onPageChange={setReviewPage}
                />
              ) : null}
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

            <div className="space-y-1.5">
              <Label htmlFor="quiz-open-at">Quiz Buka (Tanggal & Jam)</Label>
              <DateTimePicker
                value={quizForm.open_at}
                onChange={(value) => setQuizForm((prev) => ({ ...prev, open_at: value }))}
                placeholder="Pilih waktu buka quiz"
                className="border-[var(--border)] bg-[var(--card)]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="quiz-close-at">Quiz Tutup (Tanggal & Jam)</Label>
              <DateTimePicker
                value={quizForm.close_at}
                onChange={(value) => setQuizForm((prev) => ({ ...prev, close_at: value }))}
                placeholder="Pilih waktu tutup quiz"
                className="border-[var(--border)] bg-[var(--card)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <div className="flex items-center justify-between gap-3 rounded-md border border-[var(--border)] bg-[var(--muted)] px-3 py-2">
              <Label htmlFor="quiz-is-active" className="text-sm text-[var(--foreground)]">
                Quiz aktif
              </Label>
              <Switch
                id="quiz-is-active"
                checked={quizForm.is_active}
                onCheckedChange={(checked) => setQuizForm((prev) => ({ ...prev, is_active: checked }))}
              />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-md border border-[var(--border)] bg-[var(--muted)] px-3 py-2">
              <Label htmlFor="quiz-is-random" className="text-sm text-[var(--foreground)]">
                Soal diacak
              </Label>
              <Switch
                id="quiz-is-random"
                checked={quizForm.is_random}
                onCheckedChange={(checked) => setQuizForm((prev) => ({ ...prev, is_random: checked }))}
              />
            </div>
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

      <AdminModal
        open={assignmentModalOpen}
        onClose={closeAssignmentModal}
        title={editingAssignmentId ? "Edit Assignment" : "Tambah Assignment"}
        description="Assignment akan otomatis terhubung ke section course yang sedang Anda kelola."
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 rounded-lg border border-[var(--border)] bg-[var(--muted)] p-4 md:grid-cols-2">
            <div className="space-y-1.5 md:col-span-2">
              <Label>Section</Label>
              <div className="flex min-h-9 items-center rounded-md border border-[var(--border)] bg-[var(--card)] px-3 text-sm text-[var(--foreground)]">
                {selectedAssignmentSectionLabel ?? "Section belum tersedia"}
              </div>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="assignment-title">Judul Assignment</Label>
              <Input
                id="assignment-title"
                value={assignmentForm.title}
                onChange={(event) => setAssignmentForm((prev) => ({ ...prev, title: event.target.value }))}
                className="border-[var(--border)] bg-[var(--card)]"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="assignment-description">Deskripsi</Label>
              <Textarea
                id="assignment-description"
                rows={3}
                value={assignmentForm.description}
                onChange={(event) => setAssignmentForm((prev) => ({ ...prev, description: event.target.value }))}
                className="border-[var(--border)] bg-[var(--card)]"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="assignment-instructions">Instruksi</Label>
              <Textarea
                id="assignment-instructions"
                rows={3}
                value={assignmentForm.instructions}
                onChange={(event) => setAssignmentForm((prev) => ({ ...prev, instructions: event.target.value }))}
                className="border-[var(--border)] bg-[var(--card)]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="assignment-due-at">Deadline (Tanggal & Jam)</Label>
              <DateTimePicker
                value={assignmentForm.due_at}
                onChange={(value) => setAssignmentForm((prev) => ({ ...prev, due_at: value }))}
                placeholder="Pilih deadline assignment"
                className="border-[var(--border)] bg-[var(--card)]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="assignment-max-attempts">Max Attempts</Label>
              <Input
                id="assignment-max-attempts"
                type="number"
                min={1}
                value={assignmentForm.max_attempts}
                onChange={(event) => setAssignmentForm((prev) => ({ ...prev, max_attempts: event.target.value }))}
                className="border-[var(--border)] bg-[var(--card)]"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label>Status</Label>
              <Select
                value={assignmentForm.status}
                onValueChange={(value) =>
                  setAssignmentForm((prev) => ({
                    ...prev,
                    status: value as AssignmentFormState["status"],
                  }))
                }
              >
                <SelectTrigger className="h-9 w-full border-[var(--border)] bg-[var(--card)]">
                  <SelectValue>
                    {assignmentForm.status === "draft"
                      ? "Draft"
                      : assignmentForm.status === "archived"
                        ? "Archived"
                        : "Published"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <div className="flex items-center justify-between gap-3 rounded-md border border-[var(--border)] bg-[var(--muted)] px-3 py-2">
              <Label htmlFor="assignment-required" className="text-sm text-[var(--foreground)]">
                Wajib untuk sertifikat
              </Label>
              <Switch
                id="assignment-required"
                checked={assignmentForm.is_required_for_certificate}
                onCheckedChange={(checked) =>
                  setAssignmentForm((prev) => ({ ...prev, is_required_for_certificate: Boolean(checked) }))
                }
              />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-md border border-[var(--border)] bg-[var(--muted)] px-3 py-2">
              <Label htmlFor="assignment-resubmit" className="text-sm text-[var(--foreground)]">
                Izinkan resubmit
              </Label>
              <Switch
                id="assignment-resubmit"
                checked={assignmentForm.allow_resubmission}
                onCheckedChange={(checked) =>
                  setAssignmentForm((prev) => ({ ...prev, allow_resubmission: Boolean(checked) }))
                }
              />
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--border)] pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={closeAssignmentModal}
              disabled={saveAssignmentMutation.isPending}
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={() => saveAssignmentMutation.mutate()}
              disabled={saveAssignmentMutation.isPending}
              className="bg-[var(--primary)] text-[var(--primary-foreground)] hover:brightness-95"
            >
              {saveAssignmentMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              <span>{editingAssignmentId ? "Simpan Perubahan" : "Simpan Assignment"}</span>
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
        open={reviewToDelete !== null}
        title="Hapus Review"
        description={
          reviewToDelete
            ? `Review dari "${reviewToDelete.user?.fullname ?? `Student #${reviewToDelete.user_id}`}" akan dihapus. Aksi ini tidak dapat dibatalkan.`
            : ""
        }
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        isPending={deleteReviewMutation.isPending}
        onClose={() => {
          if (deleteReviewMutation.isPending) return;
          setReviewToDelete(null);
        }}
        onConfirm={() => {
          if (!reviewToDelete) return;
          deleteReviewMutation.mutate(reviewToDelete.id);
        }}
      />

      <ConfirmAlertDialog
        open={confirmDeleteSection !== null}
        title="Hapus Section"
        description={
          confirmDeleteSection
            ? `Section "${confirmDeleteSection.sectionTitle}" akan dihapus dari kurikulum ini.`
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
            {isFirstStep ? (
              <Button
                type="button"
                onClick={handleNextStep}
                disabled={isPrimaryActionPending}
                className="bg-[var(--primary)] text-[var(--primary-foreground)] hover:brightness-95"
              >
                {isPrimaryActionPending ? <Loader2 className="size-4 animate-spin" /> : null}
                <span>Next</span>
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrevStep}
                  disabled={isPrimaryActionPending}
                >
                  <ArrowLeft className="size-4" />
                  <span>Previous</span>
                </Button>

                {activeStepIndex <= 1 ? (
                  <Button
                    type="button"
                    onClick={handleSaveCourseFromAnyStep}
                    disabled={isPrimaryActionPending}
                    className="bg-[var(--primary)] text-[var(--primary-foreground)] hover:brightness-95"
                  >
                    {isPrimaryActionPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                    <span>Simpan</span>
                  </Button>
                ) : null}

                {!isLastStep ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleNextStep}
                    disabled={isPrimaryActionPending}
                  >
                    <span>Next</span>
                  </Button>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

