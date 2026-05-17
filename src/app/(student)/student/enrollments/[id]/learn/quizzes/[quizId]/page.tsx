"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";
import {
  getStudentEnrollmentQuizDetail,
  getStudentQuizAttempt,
  getStudentQuizAttempts,
  submitStudentQuizAttempt,
  upsertStudentQuizAnswer,
} from "@/features/student/api/store-api";
import {
  formatQuizAttemptStatus,
  getActiveQuizAttempt,
  getLatestQuizAttempt,
} from "@/features/student/lib/quiz";
import { formatUtcDateTimeToJakarta, parseUtcDateTime } from "@/features/student/lib/date-time";
import type {
  StoreQuizAnswer,
  StoreQuizAttempt,
  StoreQuizDetail,
  StoreQuizQuestion,
} from "@/types/store";

function formatDateTime(value: string | null | undefined): string {
  return formatUtcDateTimeToJakarta(value);
}

function formatCountdown(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
  }

  return [minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

function getAttemptDeadline(
  quiz: StoreQuizDetail | undefined,
  attempt: StoreQuizAttempt | undefined,
): Date | null {
  const startedAt = parseUtcDateTime(attempt?.started_at);
  const duration = Number(quiz?.duration ?? 0);

  if (!startedAt || duration <= 0) {
    return null;
  }

  return new Date(startedAt.getTime() + duration * 60_000);
}

function getAttemptAnswer(
  attempt: StoreQuizAttempt | undefined,
  questionId: number,
): StoreQuizAnswer | null {
  return attempt?.answers?.find((answer) => answer.question_id === questionId) ?? null;
}

function restoreAttemptAnswer(
  attempt: StoreQuizAttempt | undefined,
  questionId: number,
  previousAnswer: StoreQuizAnswer | null,
): StoreQuizAttempt | undefined {
  if (!attempt) {
    return attempt;
  }

  if (!previousAnswer) {
    return {
      ...attempt,
      answers: (attempt.answers ?? []).filter((answer) => answer.question_id !== questionId),
    };
  }

  return upsertAttemptAnswer(attempt, previousAnswer);
}

function buildOptimisticAnswer(
  attemptId: number,
  questionId: number,
  selectedOptionId: number,
  previousAnswer: StoreQuizAnswer | null,
): StoreQuizAnswer {
  const timestamp = new Date().toISOString();

  return {
    id: previousAnswer?.id ?? -questionId,
    attempt_id: attemptId,
    question_id: questionId,
    selected_option_id: selectedOptionId,
    answer_text: previousAnswer?.answer_text ?? null,
    is_correct: previousAnswer?.is_correct ?? null,
    score: previousAnswer?.score ?? 0,
    created_at: previousAnswer?.created_at ?? timestamp,
    updated_at: timestamp,
  };
}

function formatTimeoutMessage(deadline: Date | null): string {
  if (!deadline) {
    return "-";
  }

  return `Waktu quiz habis pada ${formatDateTime(deadline.toISOString())}. Jawaban terkunci, tetapi attempt masih bisa dikumpulkan.`;
}

function formatQuestionType(type: string): string {
  return type.replaceAll("_", " ");
}

function getQuizAttemptLockReason(quiz: StoreQuizDetail | undefined): string | null {
  if (!quiz) {
    return null;
  }

  if (!quiz.is_active) {
    return "Quiz sedang nonaktif, jadi attempt baru atau submit tidak tersedia.";
  }

  const now = Date.now();
  const openAt = parseUtcDateTime(quiz.open_at)?.getTime() ?? null;
  const closeAt = parseUtcDateTime(quiz.close_at)?.getTime() ?? null;

  if (openAt && openAt > now) {
    return `Quiz baru bisa dikerjakan mulai ${formatDateTime(quiz.open_at)}.`;
  }

  if (closeAt && closeAt < now) {
    return `Quiz sudah ditutup sejak ${formatDateTime(quiz.close_at)}.`;
  }

  return null;
}

function upsertAttemptAnswer(
  attempt: StoreQuizAttempt | undefined,
  answer: StoreQuizAnswer,
): StoreQuizAttempt | undefined {
  if (!attempt) {
    return attempt;
  }

  const currentAnswers = attempt.answers ?? [];
  const nextAnswers = [
    ...currentAnswers.filter((item) => item.question_id !== answer.question_id),
    answer,
  ].sort((left, right) => left.question_id - right.question_id);

  return {
    ...attempt,
    answers: nextAnswers,
  };
}

function getAttemptDisplayNumber(attempts: StoreQuizAttempt[], attemptId: number | null | undefined): number | null {
  if (!attemptId) {
    return null;
  }

  const attemptIndex = attempts.findIndex((attempt) => attempt.id === attemptId);
  if (attemptIndex < 0) {
    return null;
  }

  return attempts.length - attemptIndex;
}

export default function StudentEnrollmentQuizPage() {
  const params = useParams<{ id: string; quizId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const enrollmentId = Number(params.id);
  const quizId = Number(params.quizId);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const requestedAttemptId = Number(searchParams.get("attemptId"));
  const hasRequestedAttemptId = Number.isFinite(requestedAttemptId) && requestedAttemptId > 0;

  const attemptsQueryKey = ["student", "enrollment", enrollmentId, "quiz", quizId, "attempts"] as const;
  const getAttemptQueryKey = (attemptId: number) =>
    ["student", "enrollment", enrollmentId, "quiz", quizId, "attempt", attemptId] as const;

  const quizDetailQuery = useQuery({
    queryKey: ["student", "enrollment", enrollmentId, "quiz", quizId, "detail"],
    queryFn: () => getStudentEnrollmentQuizDetail(enrollmentId, quizId),
    enabled: Number.isFinite(enrollmentId) && enrollmentId > 0 && Number.isFinite(quizId) && quizId > 0,
  });

  const attemptsQuery = useQuery({
    queryKey: attemptsQueryKey,
    queryFn: () => getStudentQuizAttempts(enrollmentId, quizId),
    enabled: Number.isFinite(enrollmentId) && enrollmentId > 0 && Number.isFinite(quizId) && quizId > 0,
  });

  const attempts = attemptsQuery.data ?? [];
  const activeAttempt = getActiveQuizAttempt(attempts);
  const latestAttempt = getLatestQuizAttempt(attempts);
  const resolvedAttemptId =
    (hasRequestedAttemptId ? requestedAttemptId : null) ??
    activeAttempt?.id ??
    latestAttempt?.id ??
    null;
  const attemptDetailQueryKey = resolvedAttemptId ? getAttemptQueryKey(resolvedAttemptId) : null;

  const attemptDetailQuery = useQuery({
    queryKey: attemptDetailQueryKey ?? ["student", "enrollment", enrollmentId, "quiz", quizId, "attempt", "idle"],
    queryFn: () => getStudentQuizAttempt(enrollmentId, quizId, resolvedAttemptId as number),
    enabled:
      Number.isFinite(enrollmentId) &&
      enrollmentId > 0 &&
      Number.isFinite(quizId) &&
      quizId > 0 &&
      Boolean(resolvedAttemptId),
  });

  const quiz = quizDetailQuery.data;
  const currentAttempt = attemptDetailQuery.data;
  const questionAnswers = useMemo(() => {
    return new Map((currentAttempt?.answers ?? []).map((answer) => [answer.question_id, answer]));
  }, [currentAttempt?.answers]);
  const attemptDeadline = getAttemptDeadline(quiz, currentAttempt);
  const attemptDeadlineMs = attemptDeadline?.getTime() ?? null;
  const remainingTimeMs = attemptDeadlineMs !== null ? Math.max(attemptDeadlineMs - nowMs, 0) : null;
  const attemptLockReason = getQuizAttemptLockReason(quiz);
  const hasQuestions = (quiz?.questions?.length ?? 0) > 0;
  const isAttemptInProgress = currentAttempt?.status === "in_progress";
  const isTimedOut = isAttemptInProgress && remainingTimeMs !== null && remainingTimeMs === 0;
  const canEditAttempt = isAttemptInProgress && !attemptLockReason && !isTimedOut;
  const canSubmitAttempt = isAttemptInProgress && (currentAttempt?.answers?.length ?? 0) > 0;
  const unsupportedTypesLabel = (quiz?.unsupported_question_types ?? [])
    .map((type) => formatQuestionType(type))
    .join(", ");
  const countdownLabel = remainingTimeMs !== null ? formatCountdown(remainingTimeMs) : null;
  const attemptDisplayNumber = getAttemptDisplayNumber(attempts, currentAttempt?.id);

  useEffect(() => {
    if (!isAttemptInProgress || attemptDeadlineMs === null) {
      return undefined;
    }

    const timerId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timerId);
    };
  }, [attemptDeadlineMs, isAttemptInProgress]);

  const answerMutation = useMutation({
    mutationFn: ({ questionId, selectedOptionId }: { questionId: number; selectedOptionId: number }) => {
      if (!resolvedAttemptId) {
        throw new Error("Attempt belum tersedia.");
      }

        return upsertStudentQuizAnswer(enrollmentId, quizId, resolvedAttemptId, questionId, {
          selected_option_id: selectedOptionId,
        });
      },
    onMutate: ({ questionId, selectedOptionId }) => {
      if (!attemptDetailQueryKey || !resolvedAttemptId) {
        return {
          previousAnswer: null,
          questionId,
          selectedOptionId,
        };
      }

      const previousAttempt = queryClient.getQueryData<StoreQuizAttempt>(attemptDetailQueryKey);
      const previousAnswer = getAttemptAnswer(previousAttempt, questionId);
      const optimisticAnswer = buildOptimisticAnswer(
        resolvedAttemptId,
        questionId,
        selectedOptionId,
        previousAnswer,
      );

      queryClient.setQueryData<StoreQuizAttempt | undefined>(attemptDetailQueryKey, (attempt) =>
        upsertAttemptAnswer(attempt, optimisticAnswer),
      );

      return {
        previousAnswer,
        questionId,
        selectedOptionId,
      };
    },
    onSuccess: (answer) => {
      if (!attemptDetailQueryKey) {
        return;
      }

      queryClient.setQueryData<StoreQuizAttempt | undefined>(attemptDetailQueryKey, (attempt) => {
        const currentAnswer = getAttemptAnswer(attempt, answer.question_id);
        if (currentAnswer && currentAnswer.selected_option_id !== answer.selected_option_id) {
          return attempt;
        }

        return upsertAttemptAnswer(attempt, answer);
      });
    },
    onError: (error, variables, context) => {
      if (attemptDetailQueryKey) {
        queryClient.setQueryData<StoreQuizAttempt | undefined>(attemptDetailQueryKey, (attempt) => {
          const currentAnswer = getAttemptAnswer(attempt, variables.questionId);
          if (currentAnswer && currentAnswer.selected_option_id !== variables.selectedOptionId) {
            return attempt;
          }

          return restoreAttemptAnswer(attempt, variables.questionId, context?.previousAnswer ?? null);
        });
      }

      if (error instanceof ApiError) {
        toast.error(error.message);
        return;
      }

      toast.error("Jawaban quiz belum tersimpan.");
    }
  });

  const submitAttemptMutation = useMutation({
    mutationFn: () => {
      if (!resolvedAttemptId) {
        throw new Error("Attempt belum tersedia.");
      }

      return submitStudentQuizAttempt(enrollmentId, quizId, resolvedAttemptId);
    },
    onSuccess: (attempt) => {
      queryClient.setQueryData<StoreQuizAttempt>(getAttemptQueryKey(attempt.id), attempt);
      queryClient.invalidateQueries({ queryKey: attemptsQueryKey });
      toast.success("Quiz berhasil dikumpulkan.");
      router.replace(`/student/enrollments/${enrollmentId}/learn?quizId=${quizId}`);
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        toast.error(error.message);
        return;
      }

      toast.error("Quiz belum bisa dikumpulkan.");
    },
  });

  if (quizDetailQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Memuat detail quiz...</p>;
  }

  if (quizDetailQuery.isError || !quiz) {
    return <p className="text-sm text-red-600">Detail quiz tidak bisa diakses.</p>;
  }

  const renderQuestionCard = (question: StoreQuizQuestion, index: number) => {
    const savedAnswer = questionAnswers.get(question.id);
    const selectedOptionId = savedAnswer?.selected_option_id ?? null;
    const isReadOnly = !canEditAttempt;

    return (
      <article
        key={question.id}
        className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.08em] text-[var(--muted-foreground)] uppercase">
              Soal {index + 1}
            </p>
            <h2 className="mt-2 text-xl font-semibold text-[var(--foreground)]">{question.question_text}</h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Tipe: {formatQuestionType(question.type)} | Bobot: {question.score}
            </p>
          </div>
        </div>

        {question.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={question.image_url}
            alt={`Gambar soal ${index + 1}`}
            className="mt-4 max-h-72 w-full rounded-lg border border-[var(--border)] object-contain"
          />
        ) : null}

        <div className="mt-5 space-y-3">
          {question.options.map((option) => {
            const isSelected = selectedOptionId === option.id;

            return (
              <label
                key={option.id}
                className={[
                  "flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition",
                  isSelected
                    ? "border-[var(--secondary)] bg-[var(--secondary)]/10"
                    : "border-[var(--border)] bg-[var(--muted)]/30 hover:bg-[var(--surface-hover)]",
                  isReadOnly ? "cursor-default" : "",
                ].join(" ")}
              >
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  checked={isSelected}
                  onChange={() =>
                    answerMutation.mutate({
                      questionId: question.id,
                      selectedOptionId: option.id,
                    })
                  }
                  disabled={!canEditAttempt}
                  className="mt-1 size-4 border-[var(--border)] text-[var(--secondary)]"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-[var(--foreground)]">{option.option_text}</p>
                  {option.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={option.image_url}
                      alt={`Pilihan soal ${index + 1}`}
                      className="mt-3 max-h-56 rounded-lg border border-[var(--border)] object-contain"
                    />
                  ) : null}
                  {isReadOnly && isSelected ? (
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className="inline-flex rounded-full bg-[var(--muted)] px-2.5 py-1 text-[var(--foreground)]">
                        Pilihan Anda
                      </span>
                      {savedAnswer?.is_correct === true ? (
                        <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-700">
                          Benar
                        </span>
                      ) : null}
                      {savedAnswer?.is_correct === false ? (
                        <span className="inline-flex rounded-full bg-rose-100 px-2.5 py-1 text-rose-700">
                          Salah
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </label>
            );
          })}
        </div>

        {isReadOnly && !savedAnswer ? (
          <p className="mt-4 text-sm text-[var(--muted-foreground)]">Soal ini tidak dijawab.</p>
        ) : null}
      </article>
    );
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Link
          href={`/student/enrollments/${enrollmentId}/learn`}
          className="inline-flex items-center gap-2 text-primary hover:underline"
        >
          <ArrowLeft className="size-4" />
          Kembali ke halaman belajar
        </Link>
        <Link href={`/student/enrollments/${enrollmentId}`} className="text-primary hover:underline">
          Detail kelas
        </Link>
      </div>

      <header className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
        <p className="text-xs font-semibold tracking-[0.08em] text-[var(--muted-foreground)] uppercase">
          Student Quiz
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-[var(--foreground)]">{quiz.title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[var(--muted-foreground)]">
          {quiz.description || "Quiz ini belum memiliki deskripsi."}
        </p>
      </header>

      {!quiz.is_supported ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="flex items-center gap-2 font-medium">
            <ShieldAlert className="size-4" />
            Tipe quiz ini belum didukung di v1.
          </p>
          <p className="mt-1">
            Tipe soal yang belum didukung: {unsupportedTypesLabel || "Tidak diketahui"}.
          </p>
        </div>
      ) : null}

      {!hasQuestions ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="flex items-center gap-2 font-medium">
            <CircleAlert className="size-4" />
            Quiz ini belum memiliki soal aktif.
          </p>
        </div>
      ) : null}

      {attemptLockReason ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="flex items-center gap-2 font-medium">
            <CircleAlert className="size-4" />
            Attempt terkunci
          </p>
          <p className="mt-1">{attemptLockReason}</p>
        </div>
      ) : null}

      {isTimedOut ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="flex items-center gap-2 font-medium">
            <CircleAlert className="size-4" />
            Waktu quiz habis
          </p>
          <p className="mt-1">{formatTimeoutMessage(attemptDeadline)}</p>
        </div>
      ) : null}

      <div className="space-y-4">
        {attemptsQuery.isLoading ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 text-sm text-[var(--muted-foreground)] shadow-sm">
            Memuat data attempt quiz...
          </div>
        ) : null}

        {attemptsQuery.isError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700 shadow-sm">
            Riwayat attempt quiz belum bisa dimuat.
          </div>
        ) : null}

          {resolvedAttemptId && attemptDetailQuery.isLoading ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 text-sm text-[var(--muted-foreground)] shadow-sm">
              Memuat attempt quiz...
            </div>
          ) : null}

          {resolvedAttemptId && attemptDetailQuery.isError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700 shadow-sm">
              Detail attempt quiz belum bisa dimuat.
            </div>
          ) : null}

          {!resolvedAttemptId ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 text-sm text-[var(--muted-foreground)] shadow-sm">
              Mulai quiz dari halaman belajar untuk membuat attempt baru atau pilih hasil attempt dari daftar riwayat.
            </div>
          ) : null}

          {currentAttempt ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold tracking-[0.08em] text-[var(--muted-foreground)] uppercase">
                    Attempt {attemptDisplayNumber ? `#${attemptDisplayNumber}` : ""}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
                    {isAttemptInProgress ? "Sedang Mengerjakan Quiz" : "Ringkasan Hasil Quiz"}
                  </h2>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                    Status: {formatQuizAttemptStatus(currentAttempt.status)}
                  </p>
                </div>
                {isAttemptInProgress ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-[var(--secondary)] px-3 py-1 text-xs font-medium text-[var(--secondary-foreground)]">
                    <CheckCircle2 className="size-3.5" />
                    Jawaban disimpan otomatis
                  </span>
                ) : null}
              </div>

               <div className="mt-4 grid gap-3 text-sm text-[var(--muted-foreground)] md:grid-cols-3">
                 <p>Started at: <span className="font-medium text-[var(--foreground)]">{formatDateTime(currentAttempt.started_at)}</span></p>
                 <p>Submitted at: <span className="font-medium text-[var(--foreground)]">{formatDateTime(currentAttempt.submitted_at)}</span></p>
                 <p>Score: <span className="font-medium text-[var(--foreground)]">{currentAttempt.total_score}</span></p>
               </div>
              {isAttemptInProgress && countdownLabel ? (
                <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 px-4 py-3 text-sm">
                  <p className="text-[var(--muted-foreground)]">Sisa waktu</p>
                  <p className={isTimedOut ? "mt-1 text-2xl font-semibold text-rose-600" : "mt-1 text-2xl font-semibold text-[var(--foreground)]"}>
                    {countdownLabel}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          {currentAttempt ? quiz.questions.map(renderQuestionCard) : null}

          {currentAttempt && isAttemptInProgress ? (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
              <button
                type="button"
                onClick={() => submitAttemptMutation.mutate()}
                disabled={!canSubmitAttempt || submitAttemptMutation.isPending}
                className="inline-flex h-10 items-center rounded-md bg-[var(--secondary)] px-4 text-sm font-medium text-[var(--secondary-foreground)] transition hover:opacity-90 disabled:opacity-70"
              >
                {submitAttemptMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Mengirim Quiz
                  </>
                ) : (
                  "Submit Quiz"
                )}
              </button>
              <p className="text-sm text-[var(--muted-foreground)]">
                {canSubmitAttempt
                  ? isTimedOut
                    ? "Waktu habis. Jawaban terkunci, tetapi submit masih tersedia."
                    : "Quiz bisa dikumpulkan setelah minimal satu jawaban tersimpan."
                  : "Pilih minimal satu jawaban untuk mengaktifkan submit."}
              </p>
            </div>
          ) : null}
      </div>
    </section>
  );
}
