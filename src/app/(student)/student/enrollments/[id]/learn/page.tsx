"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ChevronDown, ChevronUp, CirclePlay, FileText, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog";
import { ApiError } from "@/lib/api/client";
import {
  getStudentEnrollmentCurriculum,
  getStudentEnrollmentLessonDetail,
  getStudentLessonProgressList,
  upsertStudentLessonProgress,
} from "@/features/student/api/store-api";
import type { StoreCurriculumSection, StoreLesson, StoreQuiz } from "@/types/store";

function toEmbeddableUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const normalizedHost = parsed.hostname.replace(/^www\./, "").toLowerCase();

    if (normalizedHost === "youtu.be") {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      if (id) {
        return `https://www.youtube.com/embed/${id}`;
      }
    }

    if (normalizedHost === "youtube.com" || normalizedHost.endsWith(".youtube.com")) {
      if (parsed.pathname === "/watch") {
        const id = parsed.searchParams.get("v");
        if (id) {
          return `https://www.youtube.com/embed/${id}`;
        }
      }

      const embedMatch = parsed.pathname.match(/^\/embed\/([^/?#]+)/);
      if (embedMatch?.[1]) {
        return `https://www.youtube.com/embed/${embedMatch[1]}`;
      }

      const shortsMatch = parsed.pathname.match(/^\/shorts\/([^/?#]+)/);
      if (shortsMatch?.[1]) {
        return `https://www.youtube.com/embed/${shortsMatch[1]}`;
      }

      const liveMatch = parsed.pathname.match(/^\/live\/([^/?#]+)/);
      if (liveMatch?.[1]) {
        return `https://www.youtube.com/embed/${liveMatch[1]}`;
      }
    }

    if (normalizedHost.includes("drive.google.com")) {
      const fileMatch = parsed.pathname.match(/\/file\/d\/([^/]+)/);
      if (fileMatch?.[1]) {
        return `https://drive.google.com/file/d/${fileMatch[1]}/preview`;
      }

      const openId = parsed.searchParams.get("id");
      if (openId) {
        return `https://drive.google.com/file/d/${openId}/preview`;
      }
    }

    return url;
  } catch {
    return url;
  }
}

function formatLessonDuration(duration: number | null | undefined): string {
  const value = Number(duration ?? 0);
  return `${value} menit`;
}

type SelectedContent =
  | { kind: "lesson"; sectionId: number; data: StoreLesson }
  | { kind: "quiz"; sectionId: number; data: StoreQuiz };

export default function StudentEnrollmentLearnPage() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const enrollmentId = Number(params.id);
  const [expandedSectionId, setExpandedSectionId] = useState<number | null>(null);
  const [selectedContent, setSelectedContent] = useState<SelectedContent | null>(null);
  const [showMarkCompleteConfirm, setShowMarkCompleteConfirm] = useState(false);

  const curriculumQuery = useQuery({
    queryKey: ["student", "enrollment", enrollmentId, "curriculum"],
    queryFn: () => getStudentEnrollmentCurriculum(enrollmentId),
    enabled: Number.isFinite(enrollmentId) && enrollmentId > 0,
  });

  const progressQuery = useQuery({
    queryKey: ["student", "enrollment", enrollmentId, "lesson-progress"],
    queryFn: () => getStudentLessonProgressList(enrollmentId),
    enabled: Number.isFinite(enrollmentId) && enrollmentId > 0,
  });

  const sections = useMemo(
    () => curriculumQuery.data?.sections ?? [],
    [curriculumQuery.data?.sections],
  );

  const completedLessonIds = useMemo(
    () =>
      new Set(
        (progressQuery.data ?? [])
          .filter((item) => Boolean(item.completed_at))
          .map((item) => item.lesson_id),
      ),
    [progressQuery.data],
  );

  const defaultSelectedContent = useMemo<SelectedContent | null>(() => {
    if (!sections.length) {
      return null;
    }

    const firstSection = sections[0];
    const firstLesson = firstSection.lessons?.[0];
    if (firstLesson) {
      return { kind: "lesson", sectionId: firstSection.id, data: firstLesson };
    }

    const firstQuiz = firstSection.quizzes?.[0];
    if (firstQuiz) {
      return { kind: "quiz", sectionId: firstSection.id, data: firstQuiz };
    }

    return null;
  }, [sections]);

  const hasSelectedContentInSections = useMemo(() => {
    if (!selectedContent) {
      return false;
    }

    return sections.some((section) => {
      if (selectedContent.kind === "lesson") {
        return section.lessons?.some((lesson) => lesson.id === selectedContent.data.id);
      }

      return section.quizzes?.some((quiz) => quiz.id === selectedContent.data.id);
    });
  }, [sections, selectedContent]);

  const markCompleteMutation = useMutation({
    mutationFn: (lessonId: number) =>
      upsertStudentLessonProgress(enrollmentId, lessonId, {
        completed_at: new Date().toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["student", "enrollment", enrollmentId, "lesson-progress"],
      });
      queryClient.invalidateQueries({
        queryKey: ["student", "enrollment", enrollmentId, "summary"],
      });
      queryClient.invalidateQueries({
        queryKey: ["student", "enrollment", enrollmentId],
      });
      queryClient.invalidateQueries({
        queryKey: ["student", "enrollments"],
      });
      toast.success("Progress lesson disimpan.");
      setShowMarkCompleteConfirm(false);
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        toast.error(error.message);
        return;
      }
      toast.error("Gagal menyimpan progress lesson.");
    },
  });

  const activeSelectedContent = hasSelectedContentInSections ? selectedContent : defaultSelectedContent;
  const activeExpandedSectionId = expandedSectionId ?? sections[0]?.id ?? null;
  const selectedLessonId = activeSelectedContent?.kind === "lesson" ? activeSelectedContent.data.id : null;

  const selectedLesson = activeSelectedContent?.kind === "lesson" ? activeSelectedContent.data : null;
  const selectedQuiz = activeSelectedContent?.kind === "quiz" ? activeSelectedContent.data : null;
  const lessonDetailQuery = useQuery({
    queryKey: ["student", "enrollment", enrollmentId, "lesson-detail", selectedLessonId],
    queryFn: () => getStudentEnrollmentLessonDetail(enrollmentId, selectedLessonId as number),
    enabled: Number.isFinite(enrollmentId) && enrollmentId > 0 && Boolean(selectedLessonId),
  });
  const activeLesson = lessonDetailQuery.data?.lesson ?? selectedLesson;
  const embedUrl = activeLesson?.lesson_url ? toEmbeddableUrl(activeLesson.lesson_url) : null;

  if (curriculumQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Memuat materi course...</p>;
  }

  if (curriculumQuery.isError || !curriculumQuery.data) {
    return <p className="text-sm text-red-600">Materi course tidak bisa diakses.</p>;
  }

  const toggleSection = (sectionId: number) => {
    setExpandedSectionId((current) => (current === sectionId ? null : sectionId));
  };

  const renderSectionItems = (section: StoreCurriculumSection) => {
    const lessonsInSection = section.lessons ?? [];
    const quizzesInSection = section.quizzes ?? [];

    return (
      <div className="space-y-2 pb-3">
        {lessonsInSection.map((lesson) => {
          const isActive =
            activeSelectedContent?.kind === "lesson" && activeSelectedContent.data.id === lesson.id;
          const isCompleted = completedLessonIds.has(lesson.id);

          return (
            <button
              key={`lesson-${lesson.id}`}
              type="button"
              onClick={() => setSelectedContent({ kind: "lesson", sectionId: section.id, data: lesson })}
              className={[
                "w-full rounded-xl border px-3 py-3 text-left transition",
                isActive
                  ? "border-[var(--secondary)] bg-[var(--secondary)]/10"
                  : "border-[var(--border)] bg-[var(--muted)]/40 hover:bg-[var(--surface-hover)]",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
                    {lesson.type === "file" ? <FileText className="size-4" /> : <CirclePlay className="size-4" />}
                    <span className="truncate">{lesson.title}</span>
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                    {formatLessonDuration(lesson.duration)}
                  </p>
                </div>
                {isCompleted ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--secondary)] px-2 py-0.5 text-xs font-semibold text-white">
                    <CheckCircle2 className="size-3.5" />
                    Selesai
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}

        {quizzesInSection.map((quiz) => {
          const isActive =
            activeSelectedContent?.kind === "quiz" && activeSelectedContent.data.id === quiz.id;
          return (
            <button
              key={`quiz-${quiz.id}`}
              type="button"
              onClick={() => setSelectedContent({ kind: "quiz", sectionId: section.id, data: quiz })}
              className={[
                "w-full rounded-xl border px-3 py-3 text-left transition",
                isActive
                  ? "border-[var(--secondary)] bg-[var(--secondary)]/10"
                  : "border-[var(--border)] bg-[var(--muted)]/40 hover:bg-[var(--surface-hover)]",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
                    <HelpCircle className="size-4" />
                    <span className="truncate">{quiz.title}</span>
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                    Quiz - Durasi: {formatLessonDuration(quiz.duration)}
                  </p>
                </div>
                <span className="inline-flex rounded-full border border-[var(--border)] px-2 py-0.5 text-xs font-semibold text-[var(--muted-foreground)]">
                  Quiz
                </span>
              </div>
            </button>
          );
        })}

        {!lessonsInSection.length && !quizzesInSection.length ? (
          <p className="rounded-md border border-dashed border-[var(--border)] p-3 text-xs text-[var(--muted-foreground)]">
            Section ini belum memiliki lesson atau quiz.
          </p>
        ) : null}
      </div>
    );
  };

  return (
    <section className="space-y-5">
      <header className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h1 className="text-2xl font-semibold text-foreground">{curriculumQuery.data.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pilih section, lalu pilih lesson/quiz. Urutan ditampilkan lesson dulu baru quiz.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
        <aside className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
          <p className="text-xs font-semibold tracking-[0.08em] text-[var(--muted-foreground)] uppercase">
            Table Of Contents
          </p>

          <div className="mt-4 space-y-3">
            {sections.map((section) => {
              const isExpanded = activeExpandedSectionId === section.id;

              return (
                <div key={section.id} className="rounded-xl border border-[var(--border)] bg-[var(--card)]">
                  <button
                    type="button"
                    onClick={() => toggleSection(section.id)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                  >
                    <span className="text-lg text-[var(--foreground)]">{section.title}</span>
                    {isExpanded ? <ChevronUp className="size-5 text-[var(--foreground)]" /> : <ChevronDown className="size-5 text-[var(--foreground)]" />}
                  </button>

                  {isExpanded ? <div className="px-3">{renderSectionItems(section)}</div> : null}
                </div>
              );
            })}
            {!sections.length ? (
              <p className="text-sm text-[var(--muted-foreground)]">Belum ada section pada course ini.</p>
            ) : null}
          </div>
        </aside>

        <article className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
          {activeLesson ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-semibold text-[var(--foreground)]">{activeLesson.title}</h2>
                <p className="text-sm text-[var(--muted-foreground)]">Durasi: {formatLessonDuration(activeLesson.duration)}</p>
                {lessonDetailQuery.data?.section ? (
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                    Section: {lessonDetailQuery.data.section.title}
                  </p>
                ) : null}
              </div>

              {embedUrl ? (
                <iframe
                  title={`Materi ${activeLesson.title}`}
                  src={embedUrl}
                  className="h-[65vh] w-full rounded-md border border-[var(--border)] bg-black/5"
                  allow="autoplay; fullscreen"
                />
              ) : (
                <div className="rounded-md border border-[var(--border)] bg-[var(--muted)] p-4 text-sm text-[var(--muted-foreground)]">
                  Lesson ini belum memiliki URL materi.
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                {activeLesson.lesson_url ? (
                  <a
                    href={activeLesson.lesson_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-9 items-center rounded-md border border-[var(--border)] px-3 text-sm text-[var(--muted-foreground)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
                  >
                    Buka Link Asli
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={() => setShowMarkCompleteConfirm(true)}
                  disabled={markCompleteMutation.isPending}
                  className="inline-flex h-9 items-center rounded-md bg-[var(--secondary)] px-3 text-sm font-medium text-[var(--secondary-foreground)] transition hover:opacity-90 disabled:opacity-70"
                >
                  Tandai Selesai
                </button>
              </div>
            </div>
          ) : selectedQuiz ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-semibold text-[var(--foreground)]">{selectedQuiz.title}</h2>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  Quiz - Durasi: {formatLessonDuration(selectedQuiz.duration)}
                </p>
              </div>

              <div className="rounded-md border border-[var(--border)] bg-[var(--muted)] p-4 text-sm text-[var(--foreground)]">
                <p className="font-medium">Detail Quiz</p>
                <p className="mt-1 text-[var(--muted-foreground)]">
                  {selectedQuiz.description || "Quiz ini belum memiliki deskripsi."}
                </p>
                <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-[var(--muted-foreground)] sm:grid-cols-3">
                  <p>Passing score: {selectedQuiz.passing_score ?? "-"}</p>
                  <p>Max attempts: {selectedQuiz.max_attempts ?? "-"}</p>
                  <p>Status: {selectedQuiz.is_active ? "Aktif" : "Nonaktif"}</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--muted-foreground)]">Pilih lesson atau quiz untuk mulai belajar.</p>
          )}
        </article>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href={`/student/enrollments/${enrollmentId}`} className="text-sm text-primary hover:underline">
          Kembali ke detail enrollment
        </Link>
        <Link href="/student/enrollments" className="text-sm text-primary hover:underline">
          Kembali ke daftar enrollment
        </Link>
      </div>

      <ConfirmAlertDialog
        open={showMarkCompleteConfirm}
        title="Tandai lesson selesai?"
        description="Progress lesson ini akan ditandai selesai untuk enrollment Anda."
        confirmLabel="Ya, tandai selesai"
        cancelLabel="Batal"
        isPending={markCompleteMutation.isPending}
        onClose={() => setShowMarkCompleteConfirm(false)}
        onConfirm={() => {
          if (!activeLesson) {
            return;
          }
          markCompleteMutation.mutate(activeLesson.id);
        }}
      />
    </section>
  );
}
