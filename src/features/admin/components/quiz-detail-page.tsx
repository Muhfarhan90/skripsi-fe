"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Circle, CircleCheck, GripVertical, Loader2, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import Sortable, { type SortableEvent } from "sortablejs";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { AdminModal } from "@/features/admin/components/admin-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api/client";
import {
  createAdminQuestionOption,
  createAdminQuizQuestion,
  deleteAdminQuestionOption,
  deleteAdminQuiz,
  deleteAdminQuizQuestion,
  getAdminCourseById,
  getAdminCourseCurriculum,
  getAdminQuizDetail,
  reorderAdminQuizQuestions,
  updateAdminQuestionOption,
  updateAdminCourseSectionQuiz,
  updateAdminQuizQuestion,
  type AdminOption,
  type AdminQuestion,
  type AdminQuiz,
  type QuestionPayload,
} from "@/features/admin/api/master-api";
import { cn } from "@/lib/utils/cn";

interface QuizDetailPageProps {
  courseId: number;
  quizId: number;
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

interface QuestionFormState {
  question_text: string;
  image_url: string;
  type: "multiple_choice" | "true_false";
  is_active: boolean;
}

interface OptionFormState {
  question_id: string;
  option_text: string;
  image_url: string;
  is_correct: boolean;
}

interface NewOptionDraft extends OptionFormState {
  client_id: string;
}

type DeleteTarget =
  | { type: "quiz"; quizId: number; quizTitle: string }
  | { type: "question"; questionId: number; questionText: string }
  | { type: "option"; questionId: number; optionId: number; optionText: string }
  | null;

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

const DEFAULT_QUESTION_FORM: QuestionFormState = {
  question_text: "",
  image_url: "",
  type: "multiple_choice",
  is_active: true,
};

const DEFAULT_OPTION_FORM: OptionFormState = {
  question_id: "",
  option_text: "",
  image_url: "",
  is_correct: false,
};

function normalizeError(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Terjadi kesalahan tak terduga";
}

function toNonNegativeNumberOrZero(raw: string): number {
  if (!raw.trim()) return 0;
  const parsed = Number(raw);
  if (Number.isNaN(parsed) || parsed < 0) return 0;
  return parsed;
}

function isInvalidOptionalNumber(raw: string): boolean {
  if (!raw.trim()) return false;
  const parsed = Number(raw);
  return Number.isNaN(parsed) || parsed < 0;
}

function toDateTimeLocalInput(value?: string | null): string {
  if (!value) return "";
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  return normalized.slice(0, 16);
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

function mapQuizToForm(quiz: AdminQuiz): QuizFormState {
  return {
    section_id: String(quiz.section_id),
    title: quiz.title,
    description: quiz.description ?? "",
    duration: quiz.duration === null ? "" : String(quiz.duration),
    passing_score: quiz.passing_score === null ? "" : String(quiz.passing_score),
    weight: quiz.weight === null ? "" : String(quiz.weight),
    max_attempts: quiz.max_attempts === null ? "" : String(quiz.max_attempts),
    open_at: toDateTimeLocalInput(quiz.open_at),
    close_at: toDateTimeLocalInput(quiz.close_at),
    is_active: quiz.is_active,
    is_random: quiz.is_random,
  };
}

function mapQuestionToForm(question: AdminQuestion): QuestionFormState {
  return {
    question_text: question.question_text,
    image_url: question.image_url ?? "",
    type: question.type === "short_answer" ? "multiple_choice" : question.type,
    is_active: question.is_active,
  };
}

function mapOptionToForm(option: AdminOption): OptionFormState {
  return {
    question_id: String(option.question_id),
    option_text: option.option_text,
    image_url: option.image_url ?? "",
    is_correct: option.is_correct,
  };
}

function createClientId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function QuizDetailPage({ courseId, quizId }: QuizDetailPageProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const curriculumReturnTo = `/admin/master-data/courses/${courseId}?step=curriculum`;
  const questionListRef = useRef<HTMLDivElement | null>(null);
  const questionTextRef = useRef<HTMLTextAreaElement | null>(null);
  const [expandedQuestionId, setExpandedQuestionId] = useState<number | null>(null);

  const [quizModalOpen, setQuizModalOpen] = useState(false);
  const [quizForm, setQuizForm] = useState<QuizFormState>(DEFAULT_QUIZ_FORM);

  const [questionModalOpen, setQuestionModalOpen] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);
  const [questionForm, setQuestionForm] = useState<QuestionFormState>(DEFAULT_QUESTION_FORM);

  const [inlineQuestionDrafts, setInlineQuestionDrafts] = useState<Record<number, QuestionFormState>>({});
  const [inlineOptionDrafts, setInlineOptionDrafts] = useState<Record<number, OptionFormState>>({});
  const [newOptionDrafts, setNewOptionDrafts] = useState<Record<number, NewOptionDraft[]>>({});
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);

  useEffect(() => {
    if (!questionModalOpen) return;

    const frameId = window.requestAnimationFrame(() => {
      questionTextRef.current?.focus();
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [questionModalOpen]);

  const courseQuery = useQuery({
    queryKey: ["admin", "courses", courseId],
    queryFn: () => getAdminCourseById(courseId),
  });

  const curriculumQuery = useQuery({
    queryKey: ["admin", "courses", "curriculum", courseId],
    queryFn: () => getAdminCourseCurriculum(courseId),
  });

  const quizDetailQuery = useQuery({
    queryKey: ["admin", "quizzes", "detail", quizId],
    queryFn: () => getAdminQuizDetail(quizId),
  });

  const courseSections = useMemo(() => {
    return (curriculumQuery.data?.sections ?? [])
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [curriculumQuery.data?.sections]);
  const sectionLabelMap = useMemo(
    () => new Map(courseSections.map((section) => [String(section.id), section.title])),
    [courseSections],
  );

  const quiz = quizDetailQuery.data;
  const questions = useMemo(() => {
    return (quiz?.questions ?? [])
      .slice()
      .sort((a, b) => (a.sort_order ?? Number.MAX_SAFE_INTEGER) - (b.sort_order ?? Number.MAX_SAFE_INTEGER));
  }, [quiz?.questions]);

  const refreshQuizDetail = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["admin", "quizzes", "detail", quizId] });
    queryClient.invalidateQueries({ queryKey: ["admin", "courses", "curriculum", courseId] });
    queryClient.invalidateQueries({ queryKey: ["admin", "courses", "quizzes", courseId] });
  }, [queryClient, quizId, courseId]);

  const saveQuizMutation = useMutation({
    mutationFn: async () => {
      if (!quizForm.section_id || !quizForm.title.trim()) {
        throw new Error("Section dan judul quiz wajib diisi");
      }
      if (
        isInvalidOptionalNumber(quizForm.duration) ||
        isInvalidOptionalNumber(quizForm.passing_score) ||
        isInvalidOptionalNumber(quizForm.max_attempts)
      ) {
        throw new Error("Durasi, passing score, dan max attempts harus angka >= 0");
      }
      if (quizForm.open_at && quizForm.close_at && new Date(quizForm.close_at) < new Date(quizForm.open_at)) {
        throw new Error("Waktu tutup quiz harus lebih besar atau sama dengan waktu buka quiz");
      }

      return updateAdminCourseSectionQuiz(courseId, Number(quizForm.section_id), quizId, {
        title: quizForm.title.trim(),
        description: quizForm.description.trim() || null,
        duration: toNonNegativeNumberOrZero(quizForm.duration),
        passing_score: toNonNegativeNumberOrZero(quizForm.passing_score),
        weight: quizForm.weight.trim() ? toNonNegativeNumberOrZero(quizForm.weight) : 100,
        max_attempts: toNonNegativeNumberOrZero(quizForm.max_attempts),
        open_at: toApiDateTimeOrNull(quizForm.open_at),
        close_at: toApiDateTimeOrNull(quizForm.close_at),
        is_active: quizForm.is_active,
        is_random: quizForm.is_random,
      });
    },
    onSuccess: () => {
      refreshQuizDetail();
      toast.success("Quiz berhasil diperbarui");
      setQuizModalOpen(false);
    },
    onError: (error) => {
      toast.error(normalizeError(error));
    },
  });

  const deleteQuizMutation = useMutation({
    mutationFn: deleteAdminQuiz,
    onSuccess: (message) => {
      toast.success(message || "Quiz berhasil dihapus");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "courses", "curriculum", courseId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "courses", "quizzes", courseId] });
      router.push(curriculumReturnTo);
    },
    onError: (error) => {
      toast.error(normalizeError(error));
    },
  });

  const saveQuestionMutation = useMutation({
    mutationFn: async () => {
      if (!questionForm.question_text.trim()) {
        throw new Error("Pertanyaan wajib diisi");
      }

      const payload: QuestionPayload = {
        question_text: questionForm.question_text.trim(),
        image_url: questionForm.image_url.trim() || null,
        type: questionForm.type,
        is_active: questionForm.is_active,
      };

      if (editingQuestionId) {
        return updateAdminQuizQuestion(quizId, editingQuestionId, payload);
      }

      return createAdminQuizQuestion(quizId, payload);
    },
    onSuccess: () => {
      refreshQuizDetail();
      toast.success(editingQuestionId ? "Question berhasil diperbarui" : "Question berhasil ditambahkan");
      setQuestionModalOpen(false);
      setQuestionForm(DEFAULT_QUESTION_FORM);
      setEditingQuestionId(null);
    },
    onError: (error) => {
      toast.error(normalizeError(error));
    },
  });

  const reorderQuestionsMutation = useMutation({
    mutationFn: (questionIds: number[]) => reorderAdminQuizQuestions(quizId, questionIds),
    onSuccess: (message) => {
      refreshQuizDetail();
      toast.success(message || "Urutan question berhasil diperbarui");
    },
    onError: (error) => {
      refreshQuizDetail();
      toast.error(normalizeError(error));
    },
  });

  useEffect(() => {
    const listElement = questionListRef.current;
    if (!listElement || questions.length < 2) {
      return;
    }

    const sortableInstance = Sortable.create(listElement, {
      animation: 150,
      handle: "[data-question-drag-handle='true']",
      draggable: "[data-question-draggable='true']",
      onEnd: (event: SortableEvent) => {
        if (event.oldIndex == null || event.newIndex == null || event.oldIndex === event.newIndex) {
          return;
        }

        if (reorderQuestionsMutation.isPending) {
          refreshQuizDetail();
          return;
        }

        const reorderedIds = Array.from(
          listElement.querySelectorAll<HTMLElement>("[data-question-draggable='true']"),
        )
          .map((element) => Number(element.dataset.questionId))
          .filter((value) => Number.isInteger(value) && value > 0);

        if (reorderedIds.length !== questions.length) {
          refreshQuizDetail();
          toast.error("Gagal membaca urutan question terbaru");
          return;
        }

        reorderQuestionsMutation.mutate(reorderedIds);
      },
    });

    return () => {
      sortableInstance.destroy();
    };
  }, [questions, reorderQuestionsMutation, refreshQuizDetail]);

  const deleteQuestionMutation = useMutation({
    mutationFn: (questionId: number) => deleteAdminQuizQuestion(quizId, questionId),
    onSuccess: (message) => {
      refreshQuizDetail();
      toast.success(message || "Question berhasil dihapus");
      setExpandedQuestionId(null);
      setDeleteTarget(null);
    },
    onError: (error) => {
      toast.error(normalizeError(error));
    },
  });

  const deleteOptionMutation = useMutation({
    mutationFn: ({ questionId, optionId }: { questionId: number; optionId: number }) =>
      deleteAdminQuestionOption(questionId, optionId),
    onSuccess: (message) => {
      refreshQuizDetail();
      toast.success(message || "Option berhasil dihapus");
      setDeleteTarget(null);
    },
    onError: (error) => {
      toast.error(normalizeError(error));
    },
  });

  const saveInlineQuestionMutation = useMutation({
    mutationFn: async ({
      question,
      questionDraft,
      optionDrafts,
      newOptions,
    }: {
      question: AdminQuestion;
      questionDraft: QuestionFormState;
      optionDrafts: Record<number, OptionFormState>;
      newOptions?: OptionFormState[];
    }) => {
      if (!questionDraft.question_text.trim()) {
        throw new Error("Pertanyaan wajib diisi");
      }

      const questionPayload: QuestionPayload = {
        question_text: questionDraft.question_text.trim(),
        image_url: questionDraft.image_url.trim() || null,
        type: questionDraft.type,
        is_active: questionDraft.is_active,
      };

      await updateAdminQuizQuestion(quizId, question.id, questionPayload);

      for (const option of question.options ?? []) {
        const draft = optionDrafts[option.id];
        if (!draft) continue;
        if (!draft.option_text.trim()) continue;

        const changed =
          draft.option_text !== option.option_text ||
          draft.image_url !== (option.image_url ?? "") ||
          draft.is_correct !== option.is_correct;

        if (!changed) continue;

        await updateAdminQuestionOption(option.question_id, option.id, {
          option_text: draft.option_text.trim(),
          image_url: draft.image_url.trim() || null,
          is_correct: draft.is_correct,
        });
      }

      for (const draftOption of newOptions ?? []) {
        if (!draftOption.option_text.trim()) continue;
        await createAdminQuestionOption(question.id, {
          option_text: draftOption.option_text.trim(),
          image_url: draftOption.image_url.trim() || null,
          is_correct: draftOption.is_correct,
        });
      }

      return question.id;
    },
    onSuccess: (questionId) => {
      refreshQuizDetail();
      toast.success("Question dan option berhasil disimpan");

      setInlineQuestionDrafts((prev) => {
        const next = { ...prev };
        delete next[questionId];
        return next;
      });

      setInlineOptionDrafts((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((key) => {
          const optionId = Number(key);
          if (!Number.isInteger(optionId)) return;
          const candidate = next[optionId];
          if (Number(candidate.question_id) === questionId) {
            delete next[optionId];
          }
        });
        return next;
      });

      setNewOptionDrafts((prev) => {
        const next = { ...prev };
        delete next[questionId];
        return next;
      });
    },
    onError: (error) => {
      toast.error(normalizeError(error));
    },
  });

  if (courseQuery.isLoading || quizDetailQuery.isLoading) {
    return (
      <section className="space-y-5">
        <AdminPageHeader title="Detail Quiz" description="Memuat data quiz..." />
        <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <CardContent className="flex items-center gap-2 p-5 text-sm text-[var(--muted-foreground)]">
            <Loader2 className="size-4 animate-spin" />
            Memuat detail quiz...
          </CardContent>
        </Card>
      </section>
    );
  }

  if (courseQuery.isError || quizDetailQuery.isError || !courseQuery.data || !quiz) {
    return (
      <section className="space-y-5">
        <AdminPageHeader
          title="Detail Quiz"
          description="Data quiz tidak dapat dimuat. Kembali ke halaman course untuk mencoba lagi."
        />
        <Button type="button" variant="outline" onClick={() => router.push(curriculumReturnTo)}>
          Kembali ke Detail Course
        </Button>
      </section>
    );
  }

  if (quiz.course_id !== courseId) {
    return (
      <section className="space-y-5">
        <AdminPageHeader
          title="Detail Quiz"
          description="Quiz ini tidak terhubung dengan course yang dipilih."
        />
        <Button type="button" variant="outline" onClick={() => router.push(curriculumReturnTo)}>
          Kembali ke Detail Course
        </Button>
      </section>
    );
  }

  const selectedSectionLabel = quizForm.section_id
    ? sectionLabelMap.get(quizForm.section_id) ?? "Section tidak ditemukan"
    : undefined;

  const deleteDialogTitle =
    deleteTarget?.type === "quiz"
      ? "Hapus Quiz"
      : deleteTarget?.type === "question"
        ? "Hapus Question"
        : deleteTarget?.type === "option"
          ? "Hapus Option"
          : "Konfirmasi";

  const deleteDialogDescription =
    deleteTarget?.type === "quiz"
      ? `Quiz "${deleteTarget.quizTitle}" akan dihapus permanen. Aksi ini tidak dapat dibatalkan.`
      : deleteTarget?.type === "question"
        ? `Question "${deleteTarget.questionText}" akan dihapus beserta seluruh option di bawahnya.`
        : deleteTarget?.type === "option"
          ? `Option "${deleteTarget.optionText}" akan dihapus dari question ini.`
          : "";

  const deleteDialogPending =
    (deleteTarget?.type === "quiz" && deleteQuizMutation.isPending) ||
    (deleteTarget?.type === "question" && deleteQuestionMutation.isPending) ||
    (deleteTarget?.type === "option" && deleteOptionMutation.isPending);

  return (
    <section className="space-y-5">
      <AdminPageHeader
        title={`Detail Quiz: ${quiz.title}`}
        description={`Course: ${courseQuery.data.title}. Kelola question dan option secara nested.`}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button type="button" variant="outline" onClick={() => router.push(curriculumReturnTo)}>
          Kembali ke Detail Course
        </Button>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setQuizForm(mapQuizToForm(quiz));
              setQuizModalOpen(true);
            }}
          >
            <Pencil className="size-4" />
            <span>Edit Quiz</span>
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={deleteQuizMutation.isPending}
            onClick={() => {
              setDeleteTarget({
                type: "quiz",
                quizId: quiz.id,
                quizTitle: quiz.title,
              });
            }}
            className="border-[var(--danger-soft-border)] bg-[var(--danger-soft-bg)] text-[var(--danger-soft-foreground)] hover:opacity-90"
          >
            {deleteQuizMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            <span>Hapus Quiz</span>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-5">
      <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between border-b border-[var(--border)]">
          <div>
            <CardTitle className="text-base font-semibold text-[var(--foreground)]">Questions</CardTitle>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              Drag handle untuk ubah urutan. Score dibagi otomatis dari total 100.
            </p>
          </div>
                          <Button
                            type="button"
                            onClick={() => {
                              setEditingQuestionId(null);
                              setQuestionForm(DEFAULT_QUESTION_FORM);
              setQuestionModalOpen(true);
            }}
            disabled={reorderQuestionsMutation.isPending}
            className="bg-[var(--primary)] text-[var(--primary-foreground)] hover:brightness-95"
          >
            <Plus className="size-4" />
            <span>Tambah Question</span>
          </Button>
        </CardHeader>
        <CardContent ref={questionListRef} className="space-y-3 p-4">
          {questions.length === 0 ? (
            <p className="rounded-md border border-dashed border-[var(--border)] bg-[var(--muted)] p-4 text-sm text-[var(--muted-foreground)]">
              Belum ada question pada quiz ini.
            </p>
          ) : (
            questions.map((question, index) => {
              const isExpanded = expandedQuestionId === question.id;
              const questionDraft = inlineQuestionDrafts[question.id] ?? mapQuestionToForm(question);
              return (
                <div
                  key={question.id}
                  data-question-draggable="true"
                  data-question-id={question.id}
                  className={cn(
                    "rounded-md border bg-[var(--card)]",
                    isExpanded ? "border-blue-500/80 shadow-sm" : "border-[var(--border)]",
                  )}
                >
                  <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-3 py-2">
                    <button
                      type="button"
                      onClick={() => setExpandedQuestionId((prev) => (prev === question.id ? null : question.id))}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                          {question.type === "multiple_choice" ? "Multiple Choice" : "True / False"}
                        </p>
                        {!isExpanded ? (
                          <p className="truncate text-sm font-medium text-[var(--foreground)]">{question.question_text}</p>
                        ) : null}
                      </div>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        data-question-drag-handle="true"
                        className="cursor-grab rounded p-1 text-[var(--muted-foreground)] active:cursor-grabbing"
                        aria-label="Drag untuk ubah urutan question"
                      >
                        <GripVertical className="size-4" />
                      </button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon-sm"
                        disabled={deleteQuestionMutation.isPending}
                        onClick={() => {
                          setDeleteTarget({
                            type: "question",
                            questionId: question.id,
                            questionText: question.question_text,
                          });
                        }}
                        className="border-[var(--danger-soft-border)] bg-[var(--danger-soft-bg)] text-[var(--danger-soft-foreground)] hover:opacity-90"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                      {!isExpanded ? <ChevronDown className="size-4 text-[var(--muted-foreground)]" /> : null}
                    </div>
                  </div>
                  {reorderQuestionsMutation.isPending ? (
                    <div className="border-t border-[var(--border)] px-3 py-1 text-[11px] text-[var(--muted-foreground)]">
                      Menyimpan urutan question...
                    </div>
                  ) : null}

                  {isExpanded ? (
                    <div className="space-y-3 bg-[var(--card)] p-3">
                      <div className="space-y-2">
                        <p className="text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">Question Text</p>
                        <Textarea
                          value={questionDraft.question_text}
                          onChange={(event) =>
                            setInlineQuestionDrafts((prev) => ({
                              ...prev,
                              [question.id]: {
                                ...questionDraft,
                                question_text: event.target.value,
                              },
                            }))
                          }
                          rows={3}
                          className="border-[var(--border)] bg-[var(--card)]"
                        />
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Select
                              value={questionDraft.type}
                              onValueChange={(value) =>
                                setInlineQuestionDrafts((prev) => ({
                                  ...prev,
                                  [question.id]: {
                                    ...questionDraft,
                                    type: (value as QuestionFormState["type"]) ?? "multiple_choice",
                                  },
                                }))
                              }
                            >
                              <SelectTrigger className="h-9 w-44 border-[var(--border)] bg-[var(--card)]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                                <SelectItem value="true_false">True / False</SelectItem>
                              </SelectContent>
                            </Select>
                            <div className="inline-flex items-center gap-2 text-sm text-[var(--foreground)]">
                              <Checkbox
                                id={`question-inline-active-${question.id}`}
                                checked={questionDraft.is_active}
                                onCheckedChange={(checked) =>
                                  setInlineQuestionDrafts((prev) => ({
                                    ...prev,
                                    [question.id]: {
                                      ...questionDraft,
                                      is_active: checked,
                                    },
                                  }))
                                }
                              />
                              <Label htmlFor={`question-inline-active-${question.id}`}>Aktif</Label>
                            </div>
                          </div>
                        </div>
                      </div>

                          <div className="space-y-2">
                            <p className="text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">Options</p>

                        {questionDraft.type !== "multiple_choice" ? (
                          <p className="text-xs text-[var(--muted-foreground)]">
                            Tampilan khusus tipe ini belum dibuat. Saat ini fokus untuk multiple_choice.
                          </p>
                        ) : null}

                        {(question.options ?? []).length === 0 ? (
                          <p className="text-xs text-[var(--muted-foreground)]">Belum ada option untuk question ini.</p>
                        ) : (
                          <div className="space-y-2">
                            {(question.options ?? []).map((option) => {
                              const optionDraft = inlineOptionDrafts[option.id] ?? mapOptionToForm(option);
                              return (
                                <div
                                  key={option.id}
                                  className="flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-2"
                                >
                                  <span className="shrink-0 text-[var(--muted-foreground)]">
                                    {optionDraft.is_correct ? (
                                      <CircleCheck className="size-4 text-blue-600" />
                                    ) : (
                                      <Circle className="size-4" />
                                    )}
                                  </span>
                                  <Input
                                    value={optionDraft.option_text}
                                    onChange={(event) =>
                                      setInlineOptionDrafts((prev) => ({
                                        ...prev,
                                        [option.id]: {
                                          ...optionDraft,
                                          option_text: event.target.value,
                                        },
                                      }))
                                    }
                                    className="h-9 border-[var(--border)] bg-[var(--card)]"
                                  />
                                  <div className="inline-flex items-center gap-1 text-sm text-[var(--foreground)]">
                                    <Checkbox
                                      id={`inline-option-correct-existing-${option.id}`}
                                      checked={optionDraft.is_correct}
                                      onCheckedChange={(checked) =>
                                        setInlineOptionDrafts((prev) => ({
                                          ...prev,
                                          [option.id]: {
                                            ...optionDraft,
                                            is_correct: checked,
                                          },
                                          }))
                                        }
                                      />
                                      <Label htmlFor={`inline-option-correct-existing-${option.id}`}>Benar</Label>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    disabled={deleteOptionMutation.isPending}
                                    onClick={() => {
                                      setDeleteTarget({
                                        type: "option",
                                        questionId: option.question_id,
                                        optionId: option.id,
                                        optionText: option.option_text,
                                      });
                                    }}
                                    className="text-[var(--danger-soft-foreground)] hover:bg-[var(--danger-soft-bg)]"
                                  >
                                    <X className="size-4" />
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {(newOptionDrafts[question.id] ?? []).map((draftOption) => (
                          <div
                            key={draftOption.client_id}
                            className="flex items-center gap-2 rounded-md border border-dashed border-[var(--border)] bg-[var(--card)] p-2"
                          >
                            <span className="shrink-0 text-[var(--muted-foreground)]">
                              <Circle className="size-4" />
                            </span>
                            <Input
                              value={draftOption.option_text}
                              onChange={(event) =>
                                setNewOptionDrafts((prev) => ({
                                  ...prev,
                                  [question.id]: (prev[question.id] ?? []).map((item) =>
                                    item.client_id === draftOption.client_id
                                      ? { ...item, option_text: event.target.value }
                                      : item,
                                  ),
                                }))
                              }
                              placeholder="Add option text..."
                              className="h-9 border-[var(--border)] bg-[var(--card)]"
                            />
                            <div className="inline-flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
                              <Checkbox
                                id={`draft-option-correct-${draftOption.client_id}`}
                                checked={draftOption.is_correct}
                                onCheckedChange={(checked) =>
                                  setNewOptionDrafts((prev) => ({
                                    ...prev,
                                    [question.id]: (prev[question.id] ?? []).map((item) =>
                                      item.client_id === draftOption.client_id
                                        ? { ...item, is_correct: checked }
                                        : item,
                                    ),
                                  }))
                                }
                              />
                              <Label htmlFor={`draft-option-correct-${draftOption.client_id}`}>Benar</Label>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() =>
                                setNewOptionDrafts((prev) => ({
                                  ...prev,
                                  [question.id]: (prev[question.id] ?? []).filter(
                                    (item) => item.client_id !== draftOption.client_id,
                                  ),
                                }))
                              }
                            >
                              <X className="size-4" />
                            </Button>
                          </div>
                        ))}

                        <button
                          type="button"
                          onClick={() => {
                            setNewOptionDrafts((prev) => ({
                              ...prev,
                              [question.id]: [
                                ...(prev[question.id] ?? []),
                                {
                                  ...DEFAULT_OPTION_FORM,
                                  question_id: String(question.id),
                                  client_id: createClientId("new-option"),
                                },
                              ],
                            }));
                          }}
                          className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline"
                        >
                          <Plus className="size-4" />
                          Tambah Option
                        </button>

                        <div className="flex justify-end">
                          <Button
                            type="button"
                            size="sm"
                            disabled={saveInlineQuestionMutation.isPending || !questionDraft.question_text.trim()}
                            onClick={() =>
                              saveInlineQuestionMutation.mutate({
                                question,
                                questionDraft,
                                optionDrafts: inlineOptionDrafts,
                                newOptions: newOptionDrafts[question.id] ?? [],
                              })
                            }
                            className="bg-[var(--primary)] text-[var(--primary-foreground)] hover:brightness-95"
                          >
                            {saveInlineQuestionMutation.isPending ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Save className="size-4" />
                            )}
                            <span>Simpan Question</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
      </div>

      <aside className="space-y-4">
        <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <CardHeader className="border-b border-[var(--border)]">
            <CardTitle className="text-base font-semibold text-[var(--foreground)]">Quiz Summary</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 p-4">
            <div className="rounded-md border border-[var(--border)] bg-[var(--muted)] p-3">
              <p className="text-[11px] font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">Questions</p>
              <p className="mt-1 text-2xl font-semibold text-[var(--foreground)]">{questions.length}</p>
            </div>
            <div className="rounded-md border border-[var(--border)] bg-[var(--muted)] p-3">
              <p className="text-[11px] font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">Total Points</p>
              <p className="mt-1 text-2xl font-semibold text-[var(--foreground)]">
                {questions.reduce((total, question) => total + (question.score ?? 0), 0)}
              </p>
            </div>
            <div className="rounded-md border border-[var(--border)] bg-[var(--muted)] p-3">
              <p className="text-[11px] font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">Time Limit</p>
              <p className="mt-1 text-2xl font-semibold text-[var(--foreground)]">{quiz.duration ?? "-"}m</p>
            </div>
            <div className="rounded-md border border-[var(--border)] bg-[var(--muted)] p-3">
              <p className="text-[11px] font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">Pass Rate</p>
              <p className="mt-1 text-2xl font-semibold text-[var(--foreground)]">{quiz.passing_score ?? "-"}%</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <CardHeader className="border-b border-[var(--border)]">
            <CardTitle className="text-base font-semibold text-[var(--foreground)]">Question Types</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-4">
            <div className="rounded-md border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-sm text-[var(--foreground)]">
              Multiple Choice
            </div>
            <div className="rounded-md border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-sm text-[var(--foreground)]">
              True / False
            </div>
          </CardContent>
        </Card>

        <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <CardContent className="space-y-1 p-4 text-sm text-[var(--muted-foreground)]">
            <p>Section: {sectionLabelMap.get(String(quiz.section_id)) ?? "-"}</p>
            <p>Status: {quiz.is_active ? "Aktif" : "Nonaktif"}</p>
            <p>Random: {quiz.is_random ? "Ya" : "Tidak"}</p>
            <p>Quiz Buka: {quiz.open_at ?? "-"}</p>
            <p>Quiz Tutup: {quiz.close_at ?? "-"}</p>
          </CardContent>
        </Card>
      </aside>
      </div>

      <AdminModal
        open={quizModalOpen}
        onClose={() => {
          if (saveQuizMutation.isPending) return;
          setQuizModalOpen(false);
        }}
        title="Edit Quiz"
        description="Perbarui metadata quiz dan section tujuan."
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
                      const label = selectedSectionLabel ?? "Pilih section";
                      return (
                        <span className={selectedSectionLabel ? undefined : "text-[var(--muted-foreground)]"}>
                          {label}
                        </span>
                      );
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {courseSections.map((section) => (
                    <SelectItem key={section.id} value={String(section.id)}>
                      {section.title}
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
            <div className="inline-flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-sm text-[var(--foreground)]">
              <Checkbox
                id="quiz-is-active"
                checked={quizForm.is_active}
                onCheckedChange={(checked) => setQuizForm((prev) => ({ ...prev, is_active: checked }))}
              />
              <Label htmlFor="quiz-is-active" className="text-sm text-[var(--foreground)]">Quiz aktif</Label>
            </div>
            <div className="inline-flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-sm text-[var(--foreground)]">
              <Checkbox
                id="quiz-is-random"
                checked={quizForm.is_random}
                onCheckedChange={(checked) => setQuizForm((prev) => ({ ...prev, is_random: checked }))}
              />
              <Label htmlFor="quiz-is-random" className="text-sm text-[var(--foreground)]">Soal diacak</Label>
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--border)] pt-3">
            <Button type="button" variant="outline" onClick={() => setQuizModalOpen(false)} disabled={saveQuizMutation.isPending}>
              Batal
            </Button>
            <Button
              type="button"
              onClick={() => saveQuizMutation.mutate()}
              disabled={saveQuizMutation.isPending}
              className="bg-[var(--primary)] text-[var(--primary-foreground)] hover:brightness-95"
            >
              {saveQuizMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              <span>Simpan Quiz</span>
            </Button>
          </div>
        </div>
      </AdminModal>

      <AdminModal
        open={questionModalOpen}
        onClose={() => {
          if (saveQuestionMutation.isPending) return;
          setQuestionModalOpen(false);
          setEditingQuestionId(null);
          setQuestionForm(DEFAULT_QUESTION_FORM);
        }}
        title={editingQuestionId ? "Edit Question" : "Tambah Question"}
        description="Tambah atau perbarui pertanyaan untuk quiz ini. Score diatur otomatis."
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 rounded-lg border border-[var(--border)] bg-[var(--muted)] p-4 md:grid-cols-2">
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="question-text">Pertanyaan</Label>
              <Textarea
                id="question-text"
                ref={questionTextRef}
                rows={4}
                value={questionForm.question_text}
                onChange={(event) => setQuestionForm((prev) => ({ ...prev, question_text: event.target.value }))}
                className="border-[var(--border)] bg-[var(--card)]"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="question-image-url">Image URL</Label>
              <Input
                id="question-image-url"
                value={questionForm.image_url}
                onChange={(event) => setQuestionForm((prev) => ({ ...prev, image_url: event.target.value }))}
                placeholder="https://..."
                className="border-[var(--border)] bg-[var(--card)]"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Tipe Question</Label>
              <Select
                value={questionForm.type}
                onValueChange={(value) =>
                  setQuestionForm((prev) => ({
                    ...prev,
                    type: (value as QuestionFormState["type"]) ?? "multiple_choice",
                  }))
                }
              >
                <SelectTrigger className="h-9 w-full border-[var(--border)] bg-[var(--card)]">
                  <SelectValue placeholder="Pilih tipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                  <SelectItem value="true_false">True / False</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-sm text-[var(--foreground)]">
            <Checkbox
              id="question-is-active"
              checked={questionForm.is_active}
              onCheckedChange={(checked) => setQuestionForm((prev) => ({ ...prev, is_active: checked }))}
            />
            <Label htmlFor="question-is-active" className="text-sm text-[var(--foreground)]">Question aktif</Label>
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--border)] pt-3">
            <Button type="button" variant="outline" onClick={() => setQuestionModalOpen(false)} disabled={saveQuestionMutation.isPending}>
              Batal
            </Button>
            <Button
              type="button"
              onClick={() => saveQuestionMutation.mutate()}
              disabled={saveQuestionMutation.isPending}
              className="bg-[var(--primary)] text-[var(--primary-foreground)] hover:brightness-95"
            >
              {saveQuestionMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              <span>{editingQuestionId ? "Simpan Perubahan" : "Simpan Question"}</span>
            </Button>
          </div>
        </div>
      </AdminModal>

      <ConfirmAlertDialog
        open={deleteTarget !== null}
        title={deleteDialogTitle}
        description={deleteDialogDescription}
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        isPending={deleteDialogPending}
        onClose={() => {
          if (deleteDialogPending) return;
          setDeleteTarget(null);
        }}
        onConfirm={() => {
          if (!deleteTarget) return;

          if (deleteTarget.type === "quiz") {
            deleteQuizMutation.mutate(deleteTarget.quizId);
            return;
          }

          if (deleteTarget.type === "question") {
            deleteQuestionMutation.mutate(deleteTarget.questionId);
            return;
          }

          deleteOptionMutation.mutate({
            questionId: deleteTarget.questionId,
            optionId: deleteTarget.optionId,
          });
        }}
      />
    </section>
  );
}
