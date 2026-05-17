"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Award,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CirclePlay,
  ClipboardList,
  FileText,
  HelpCircle,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog";
import { ApiError } from "@/lib/api/client";
import {
  createStudentCourseReview,
  generateStudentEnrollmentCertificate,
  getStudentEnrollmentAssignments,
  getStudentEnrollmentAssignmentDetail,
  getStudentEnrollmentCertificate,
  getStudentEnrollmentCurriculum,
  getStudentEnrollmentLessonDetail,
  getStudentEnrollmentProgressSummary,
  getStudentCourseReviews,
  getStudentLessonProgressList,
  getStudentQuizAttempts,
  startStudentQuizAttempt,
  updateStudentCourseReview,
  upsertStudentLessonProgress,
} from "@/features/student/api/store-api";
import { useAuthStore } from "@/features/auth/store/auth-store";
import {
  buildStudentAssignmentHref,
  canSubmitAssignment,
  formatAssignmentStatus,
  getLatestAssignmentSubmission,
  getRemainingAssignmentAttempts,
} from "@/features/student/lib/assignment";
import {
  buildStudentQuizAttemptHref,
  formatQuizAttemptStatus,
  formatQuizDuration,
  getActiveQuizAttempt,
  getLatestQuizAttempt,
  getStudentQuizAttemptLinkClass,
  getStudentQuizAttemptLinkLabel,
} from "@/features/student/lib/quiz";
import { printCertificatePreview } from "@/features/student/lib/certificate-print";
import { formatUtcDateTimeToJakarta, parseUtcDateTime } from "@/features/student/lib/date-time";
import type {
  StoreAssignment,
  StoreCurriculumSection,
  StoreLesson,
  StoreQuiz,
  StoreQuizAttempt,
} from "@/types/store";

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

function formatCountdown(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return [minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

function getAssignmentSubmissionLinkClass(status: string): string {
  const baseClass =
    "inline-flex h-8 items-center rounded-md border px-3 text-xs font-semibold transition hover:opacity-90";

  if (status === "approved") {
    return `${baseClass} border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100`;
  }

  if (status === "revision_required") {
    return `${baseClass} border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100`;
  }

  return `${baseClass} border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100`;
}

type SelectedContent =
  | { kind: "lesson"; sectionId: number; data: StoreLesson }
  | { kind: "quiz"; sectionId: number; data: StoreQuiz }
  | { kind: "assignment"; sectionId: number; data: StoreAssignment };

function findRequestedContent(
  sections: StoreCurriculumSection[],
  requestedLessonId: number | null,
  requestedQuizId: number | null,
  requestedAssignmentId: number | null,
): SelectedContent | null {
  if (requestedLessonId) {
    for (const section of sections) {
      const lesson = section.lessons?.find((item) => item.id === requestedLessonId);
      if (lesson) {
        return { kind: "lesson", sectionId: section.id, data: lesson };
      }
    }
  }

  if (requestedQuizId) {
    for (const section of sections) {
      const quiz = section.quizzes?.find((item) => item.id === requestedQuizId);
      if (quiz) {
        return { kind: "quiz", sectionId: section.id, data: quiz };
      }
    }
  }

  if (requestedAssignmentId) {
    for (const section of sections) {
      const assignment = section.assignments?.find((item) => item.id === requestedAssignmentId);
      if (assignment) {
        return { kind: "assignment", sectionId: section.id, data: assignment };
      }
    }
  }

  return null;
}

function hasRemainingAttempts(maxAttempts: number | null | undefined, attemptCount: number): boolean {
  if (!maxAttempts || maxAttempts <= 0) {
    return true;
  }

  return attemptCount < maxAttempts;
}

function getQuizCooldownDeadline(attempt: StoreQuizAttempt | null): Date | null {
  if (!attempt || attempt.status === "in_progress") {
    return null;
  }

  const submittedAt = parseUtcDateTime(attempt.submitted_at ?? attempt.updated_at);
  if (!submittedAt) {
    return null;
  }

  return new Date(submittedAt.getTime() + 5 * 60_000);
}

function canStartQuizFromLearn(
  quiz: StoreQuiz | null,
  attempts: StoreQuizAttempt[],
  isCooldownActive: boolean,
): boolean {
  if (!quiz || !quiz.is_active || getActiveQuizAttempt(attempts)) {
    return false;
  }

  const now = Date.now();
  const openAt = parseUtcDateTime(quiz.open_at)?.getTime() ?? null;
  const closeAt = parseUtcDateTime(quiz.close_at)?.getTime() ?? null;

  if (openAt && openAt > now) {
    return false;
  }

  if (closeAt && closeAt < now) {
    return false;
  }

  if (isCooldownActive) {
    return false;
  }

  return hasRemainingAttempts(quiz.max_attempts, attempts.length);
}

export default function StudentEnrollmentLearnPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const enrollmentId = Number(params.id);
  const requestedPanel = searchParams.get("panel");
  const [expandedSectionIds, setExpandedSectionIds] = useState<number[]>([]);
  const [selectedContent, setSelectedContent] = useState<SelectedContent | null>(null);
  const [activePanel, setActivePanel] = useState<"content" | "certificate">(() =>
    requestedPanel === "certificate" ? "certificate" : "content",
  );
  const [showMarkCompleteConfirm, setShowMarkCompleteConfirm] = useState(false);
  const [showClaimCertificateConfirm, setShowClaimCertificateConfirm] = useState(false);
  const [isPrintingCertificate, setIsPrintingCertificate] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [reviewRating, setReviewRating] = useState<number | null>(null);
  const [reviewText, setReviewText] = useState<string | null>(null);
  const requestedLessonId = Number(searchParams.get("lessonId"));
  const requestedQuizId = Number(searchParams.get("quizId"));
  const requestedAssignmentId = Number(searchParams.get("assignmentId"));
  const hasRequestedLessonId = Number.isFinite(requestedLessonId) && requestedLessonId > 0;
  const hasRequestedQuizId = Number.isFinite(requestedQuizId) && requestedQuizId > 0;
  const hasRequestedAssignmentId = Number.isFinite(requestedAssignmentId) && requestedAssignmentId > 0;

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

  const summaryQuery = useQuery({
    queryKey: ["student", "enrollment", enrollmentId, "summary"],
    queryFn: () => getStudentEnrollmentProgressSummary(enrollmentId),
    enabled: Number.isFinite(enrollmentId) && enrollmentId > 0,
  });

  const certificateQuery = useQuery({
    queryKey: ["student", "enrollment", enrollmentId, "certificate"],
    queryFn: () => getStudentEnrollmentCertificate(enrollmentId),
    enabled: Number.isFinite(enrollmentId) && enrollmentId > 0,
  });

  const assignmentsQuery = useQuery({
    queryKey: ["student", "enrollment", enrollmentId, "assignments"],
    queryFn: () => getStudentEnrollmentAssignments(enrollmentId),
    enabled: Number.isFinite(enrollmentId) && enrollmentId > 0,
  });

  const sections = useMemo(
    () => curriculumQuery.data?.sections ?? [],
    [curriculumQuery.data?.sections],
  );
  const courseId = curriculumQuery.data?.id ?? null;

  const reviewsQuery = useQuery({
    queryKey: ["student", "course", courseId, "reviews"],
    queryFn: () => getStudentCourseReviews(courseId as number),
    enabled: Boolean(courseId),
  });

  const completedLessonIds = useMemo(
    () =>
      new Set(
        (progressQuery.data ?? [])
          .filter((item) => Boolean(item.completed_at))
          .map((item) => item.lesson_id),
      ),
    [progressQuery.data],
  );

  const orderedLessons = useMemo(
    () =>
      sections.flatMap((section) =>
        (section.lessons ?? []).map((lesson) => ({
          sectionId: section.id,
          lesson,
        })),
      ),
    [sections],
  );

  const lockedLessonIds = useMemo(() => {
    const ids = new Set<number>();
    let previousLessonCompleted = true;

    for (const item of orderedLessons) {
      if (!previousLessonCompleted) {
        ids.add(item.lesson.id);
      }

      if (!completedLessonIds.has(item.lesson.id)) {
        previousLessonCompleted = false;
      }
    }

    return ids;
  }, [completedLessonIds, orderedLessons]);

  const requestedSelectedContent = useMemo(() => {
    const content = findRequestedContent(
      sections,
      hasRequestedLessonId ? requestedLessonId : null,
      hasRequestedQuizId ? requestedQuizId : null,
      hasRequestedAssignmentId ? requestedAssignmentId : null,
    );

    if (content?.kind === "lesson" && lockedLessonIds.has(content.data.id)) {
      return null;
    }

    return content;
  }, [
    hasRequestedAssignmentId,
    hasRequestedLessonId,
    hasRequestedQuizId,
    lockedLessonIds,
    requestedAssignmentId,
    requestedLessonId,
    requestedQuizId,
    sections,
  ]);

  const defaultSelectedContent = useMemo<SelectedContent | null>(() => {
    if (requestedSelectedContent) {
      return requestedSelectedContent;
    }

    if (!sections.length) {
      return null;
    }

    const firstUnlockedLesson = orderedLessons.find(
      (item) => !lockedLessonIds.has(item.lesson.id),
    );
    if (firstUnlockedLesson) {
      return {
        kind: "lesson",
        sectionId: firstUnlockedLesson.sectionId,
        data: firstUnlockedLesson.lesson,
      };
    }

    const firstSection = sections[0];
    const firstQuiz = firstSection.quizzes?.[0];
    if (firstQuiz) {
      return { kind: "quiz", sectionId: firstSection.id, data: firstQuiz };
    }

    const firstAssignment = firstSection.assignments?.[0];
    if (firstAssignment) {
      return { kind: "assignment", sectionId: firstSection.id, data: firstAssignment };
    }

    return null;
  }, [lockedLessonIds, orderedLessons, requestedSelectedContent, sections]);

  const hasSelectedContentInSections = useMemo(() => {
    if (!selectedContent) {
      return false;
    }

    if (selectedContent.kind === "lesson" && lockedLessonIds.has(selectedContent.data.id)) {
      return false;
    }

    return sections.some((section) => {
      if (selectedContent.kind === "lesson") {
        return section.lessons?.some((lesson) => lesson.id === selectedContent.data.id);
      }

      if (selectedContent.kind === "quiz") {
        return section.quizzes?.some((quiz) => quiz.id === selectedContent.data.id);
      }

      return section.assignments?.some((assignment) => assignment.id === selectedContent.data.id);
    });
  }, [lockedLessonIds, sections, selectedContent]);

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

  const startQuizMutation = useMutation({
    mutationFn: (quizId: number) => startStudentQuizAttempt(enrollmentId, quizId),
    onSuccess: (attempt) => {
      queryClient.invalidateQueries({
        queryKey: ["student", "enrollment", enrollmentId, "quiz", attempt.quiz_id, "attempts"],
      });
      toast.success("Quiz berhasil dimulai.");
      router.push(buildStudentQuizAttemptHref(enrollmentId, attempt.quiz_id, attempt.id));
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        toast.error(error.message);
        return;
      }

      toast.error("Quiz belum bisa dimulai.");
    },
  });

  const assignmentRequirement = summaryQuery.data?.assignment_requirement;
  const certificate = certificateQuery.data;
  const progressValue = Number(summaryQuery.data?.progress ?? 0);
  const hasCertificate = summaryQuery.data?.has_certificate ?? Boolean(certificate);
  const certificatePreviewHref = certificate ? `/api/student/certificates/${certificate.id}/preview` : null;
  const isCourseComplete = progressValue >= 100;
  const isAssignmentRequirementSatisfied = !assignmentRequirement || assignmentRequirement.is_satisfied;
  const canClaimCertificate = isCourseComplete && isAssignmentRequirementSatisfied;
  const showCertificatePanel = activePanel === "certificate" && (hasCertificate || isCourseComplete);
  const certificateStatus = hasCertificate
    ? "Sertifikat tersedia"
    : progressValue < 100
      ? "Progress belum 100%"
      : assignmentRequirement && !assignmentRequirement.is_satisfied
        ? "Menunggu approval assignment"
        : certificateQuery.isLoading
          ? "Sertifikat sedang disiapkan"
          : "Belum tersedia";
  const currentUserReview =
    reviewsQuery.data?.find((review) => review.user_id === currentUser?.id) ?? null;
  const selectedReviewRating = reviewRating ?? currentUserReview?.rating ?? 0;
  const selectedReviewText = reviewText ?? currentUserReview?.review ?? "";

  const activeSelectedContent = showCertificatePanel
    ? null
    : hasSelectedContentInSections
      ? selectedContent
      : defaultSelectedContent;
  const effectiveExpandedSectionIds = useMemo(() => {
    const availableIds = new Set(sections.map((section) => section.id));
    const currentIds = expandedSectionIds.filter((sectionId) => availableIds.has(sectionId));
    const activeSectionId = activeSelectedContent?.sectionId ?? null;

    if (currentIds.length) {
      if (activeSectionId && !currentIds.includes(activeSectionId)) {
        return [...currentIds, activeSectionId];
      }

      return currentIds;
    }

    if (activeSectionId) {
      return [activeSectionId];
    }

    return sections[0]?.id ? [sections[0].id] : [];
  }, [activeSelectedContent, expandedSectionIds, sections]);
  const selectedLessonId = activeSelectedContent?.kind === "lesson" ? activeSelectedContent.data.id : null;

  const selectedLesson = activeSelectedContent?.kind === "lesson" ? activeSelectedContent.data : null;
  const selectedQuiz = activeSelectedContent?.kind === "quiz" ? activeSelectedContent.data : null;
  const selectedAssignment =
    activeSelectedContent?.kind === "assignment" ? activeSelectedContent.data : null;
  const selectedQuizId = selectedQuiz?.id ?? null;
  const selectedAssignmentId = selectedAssignment?.id ?? null;
  const lessonDetailQuery = useQuery({
    queryKey: ["student", "enrollment", enrollmentId, "lesson-detail", selectedLessonId],
    queryFn: () => getStudentEnrollmentLessonDetail(enrollmentId, selectedLessonId as number),
    enabled: Number.isFinite(enrollmentId) && enrollmentId > 0 && Boolean(selectedLessonId),
  });
  const quizAttemptsQuery = useQuery({
    queryKey: ["student", "enrollment", enrollmentId, "quiz", selectedQuizId, "attempts"],
    queryFn: () => getStudentQuizAttempts(enrollmentId, selectedQuizId as number),
    enabled: Number.isFinite(enrollmentId) && enrollmentId > 0 && Boolean(selectedQuizId),
  });
  const assignmentDetailQuery = useQuery({
    queryKey: ["student", "enrollment", enrollmentId, "assignment", selectedAssignmentId, "detail"],
    queryFn: () =>
      getStudentEnrollmentAssignmentDetail(enrollmentId, selectedAssignmentId as number),
    enabled: Number.isFinite(enrollmentId) && enrollmentId > 0 && Boolean(selectedAssignmentId),
  });
  const activeLesson = lessonDetailQuery.data?.lesson ?? selectedLesson;
  const embedUrl = activeLesson?.lesson_url ? toEmbeddableUrl(activeLesson.lesson_url) : null;
  const assignmentsById = useMemo(
    () => new Map((assignmentsQuery.data ?? []).map((assignment) => [assignment.id, assignment])),
    [assignmentsQuery.data],
  );
  const activeAssignment =
    selectedAssignmentId !== null
      ? (assignmentDetailQuery.data ??
        assignmentsById.get(selectedAssignmentId) ??
        selectedAssignment)
      : null;
  const assignmentSubmissions = assignmentDetailQuery.data?.submissions ?? [];
  const latestAssignmentSubmission = activeAssignment
    ? getLatestAssignmentSubmission(activeAssignment)
    : null;
  const assignmentAttemptsUsed = latestAssignmentSubmission?.attempt_no ?? 0;
  const remainingAssignmentAttempts = activeAssignment
    ? getRemainingAssignmentAttempts(activeAssignment.max_attempts, assignmentAttemptsUsed)
    : null;
  const assignmentPrimaryActionLabel =
    activeAssignment && canSubmitAssignment(activeAssignment)
      ? latestAssignmentSubmission?.status === "revision_required"
        ? "Revisi Assignment"
        : "Mulai Assignment"
      : null;
  const quizAttempts = quizAttemptsQuery.data ?? [];
  const activeQuizAttempt = getActiveQuizAttempt(quizAttempts);
  const latestQuizAttempt = getLatestQuizAttempt(quizAttempts);
  const cooldownDeadline = getQuizCooldownDeadline(latestQuizAttempt);
  const cooldownDeadlineMs = cooldownDeadline?.getTime() ?? null;
  const remainingCooldownMs =
    cooldownDeadlineMs !== null ? Math.max(cooldownDeadlineMs - nowMs, 0) : null;
  const isCooldownActive = remainingCooldownMs !== null && remainingCooldownMs > 0;
  const canStartSelectedQuiz = canStartQuizFromLearn(selectedQuiz, quizAttempts, isCooldownActive);
  const quizActionLabel =
    activeQuizAttempt
      ? "Lanjutkan Quiz"
      : canStartSelectedQuiz
        ? quizAttempts.length
          ? "Mulai Quiz Lagi"
          : "Mulai Quiz"
        : null;
  const cooldownLabel = remainingCooldownMs !== null ? formatCountdown(remainingCooldownMs) : null;
  const generateCertificateMutation = useMutation({
    mutationFn: () => generateStudentEnrollmentCertificate(enrollmentId),
    onSuccess: () => {
      setShowClaimCertificateConfirm(false);
      queryClient.invalidateQueries({
        queryKey: ["student", "enrollment", enrollmentId, "certificate"],
      });
      queryClient.invalidateQueries({
        queryKey: ["student", "enrollment", enrollmentId, "summary"],
      });
      queryClient.invalidateQueries({
        queryKey: ["student", "enrollment", enrollmentId],
      });
      queryClient.invalidateQueries({
        queryKey: ["student", "certificates"],
      });
      toast.success("Sertifikat berhasil diklaim dan siap diunduh.");
    },
    onError: (error) => {
      setShowClaimCertificateConfirm(false);
      if (error instanceof ApiError) {
        toast.error(error.message);
        return;
      }

      toast.error("Sertifikat belum bisa diklaim.");
    },
  });

  const reviewMutation = useMutation({
    mutationFn: () => {
      if (!courseId) {
        throw new Error("Course tidak ditemukan.");
      }

      const payload = {
        rating: selectedReviewRating,
        review: selectedReviewText.trim() || null,
      };

      if (currentUserReview) {
        return updateStudentCourseReview(courseId, currentUserReview.id, payload);
      }

      return createStudentCourseReview(courseId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["student", "course", courseId, "reviews"],
      });
      toast.success("Review kelas berhasil disimpan.");
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        toast.error(error.message);
        return;
      }

      toast.error("Review kelas belum bisa disimpan.");
    },
  });

  useEffect(() => {
    if (!isCooldownActive) {
      return undefined;
    }

    const timerId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timerId);
    };
  }, [isCooldownActive]);

  if (curriculumQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Memuat materi course...</p>;
  }

  if (curriculumQuery.isError || !curriculumQuery.data) {
    return <p className="text-sm text-red-600">Materi course tidak bisa diakses.</p>;
  }

  const toggleSection = (sectionId: number) => {
    setExpandedSectionIds((current) =>
      current.includes(sectionId)
        ? current.filter((item) => item !== sectionId)
        : [...current, sectionId],
    );
  };

  const selectContent = (content: SelectedContent) => {
    setActivePanel("content");
    setExpandedSectionIds((current) =>
      current.includes(content.sectionId) ? current : [...current, content.sectionId],
    );
    setSelectedContent(content);
  };

  const openCertificatePanel = () => {
    if (!isCourseComplete && !hasCertificate) {
      toast.error("Sertifikat baru bisa diakses setelah progress kelas mencapai 100%.");
      return;
    }

    setActivePanel("certificate");
    setSelectedContent(null);
  };

  const handlePrintCertificate = async () => {
    if (!certificate) {
      toast.error("Sertifikat belum tersedia.");
      return;
    }

    setIsPrintingCertificate(true);

    try {
      await printCertificatePreview(`/api/student/certificates/${certificate.id}/preview`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sertifikat tidak bisa dibuka.");
    } finally {
      setIsPrintingCertificate(false);
    }
  };

  const requestCertificateClaim = () => {
    if (!isCourseComplete) {
      toast.error("Selesaikan seluruh materi kelas sampai 100% sebelum mengklaim sertifikat.");
      return;
    }

    if (!isAssignmentRequirementSatisfied) {
      toast.error("Assignment wajib masih menunggu approval, jadi sertifikat belum bisa diklaim.");
      return;
    }

    setShowClaimCertificateConfirm(true);
  };

  const submitCourseReview = () => {
    if (!isCourseComplete) {
      toast.error("Review bisa dikirim setelah course selesai 100%.");
      return;
    }

    if (selectedReviewRating < 1) {
      toast.error("Pilih rating terlebih dahulu.");
      return;
    }

    reviewMutation.mutate();
  };

  const renderSectionItems = (section: StoreCurriculumSection) => {
    const lessonsInSection = section.lessons ?? [];
    const quizzesInSection = section.quizzes ?? [];
    const assignmentsInSection = section.assignments ?? [];

    return (
      <div className="space-y-2 pb-3">
        {lessonsInSection.map((lesson) => {
          const isActive =
            activeSelectedContent?.kind === "lesson" && activeSelectedContent.data.id === lesson.id;
          const isCompleted = completedLessonIds.has(lesson.id);
          const isLocked = lockedLessonIds.has(lesson.id);

          return (
            <button
              key={`lesson-${lesson.id}`}
              type="button"
              onClick={() => selectContent({ kind: "lesson", sectionId: section.id, data: lesson })}
              disabled={isLocked}
              className={[
                "w-full rounded-xl border px-3 py-3 text-left transition",
                isLocked
                  ? "cursor-not-allowed border-amber-200 bg-amber-50/50 opacity-75"
                  : isActive
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
                  {isLocked ? (
                    <p className="mt-1 text-[11px] font-medium text-amber-700">
                      Selesaikan lesson sebelumnya dulu.
                    </p>
                  ) : null}
                </div>
                {isCompleted ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--secondary)] px-2 py-0.5 text-xs font-semibold text-white">
                    <CheckCircle2 className="size-3.5" />
                    Selesai
                  </span>
                ) : isLocked ? (
                  <span className="inline-flex rounded-full border border-amber-200 bg-white px-2 py-0.5 text-xs font-semibold text-amber-700">
                    Terkunci
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
              onClick={() => selectContent({ kind: "quiz", sectionId: section.id, data: quiz })}
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

        {assignmentsInSection.map((assignment) => {
          const isActive =
            activeSelectedContent?.kind === "assignment" && activeSelectedContent.data.id === assignment.id;
          const currentAssignment = assignmentsById.get(assignment.id) ?? assignment;
          const latestSubmission = getLatestAssignmentSubmission(currentAssignment);

          return (
            <button
              key={`assignment-${assignment.id}`}
              type="button"
              onClick={() => selectContent({ kind: "assignment", sectionId: section.id, data: assignment })}
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
                    <ClipboardList className="size-4" />
                    <span className="truncate">{assignment.title}</span>
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                    Assignment
                    {assignment.due_at ? ` - Deadline: ${formatUtcDateTimeToJakarta(assignment.due_at)}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="inline-flex rounded-full border border-[var(--border)] px-2 py-0.5 text-xs font-semibold text-[var(--muted-foreground)]">
                    Assignment
                  </span>
                  {latestSubmission ? (
                    <span className="text-[11px] font-medium text-[var(--muted-foreground)]">
                      {formatAssignmentStatus(latestSubmission.status)}
                    </span>
                  ) : null}
                </div>
              </div>
            </button>
          );
        })}

        {!lessonsInSection.length && !quizzesInSection.length && !assignmentsInSection.length ? (
          <p className="rounded-md border border-dashed border-[var(--border)] p-3 text-xs text-[var(--muted-foreground)]">
            Section ini belum memiliki lesson, quiz, atau assignment.
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
          Pilih section, lalu pilih lesson, quiz, atau assignment. Urutan ditampilkan lesson dulu, lalu quiz, lalu assignment.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
        <aside className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
          <p className="text-xs font-semibold tracking-[0.08em] text-[var(--muted-foreground)] uppercase">
            Table Of Contents
          </p>

          <div className="mt-4 space-y-3">
            {sections.map((section) => {
              const isExpanded = effectiveExpandedSectionIds.includes(section.id);

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
            {isCourseComplete ? (
              <button
                type="button"
                onClick={openCertificatePanel}
                className={[
                  "w-full rounded-xl border px-4 py-3 text-left transition",
                  showCertificatePanel
                    ? "border-[var(--secondary)] bg-[var(--secondary)]/10"
                    : "border-[var(--border)] bg-[var(--muted)]/40 hover:bg-[var(--surface-hover)]",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
                        <Award className="size-4" />
                        Klaim Sertifikat
                      </p>
                      <p className="mt-1 text-xs text-[var(--muted-foreground)]">{certificateStatus}</p>
                    </div>
                    <span className="inline-flex rounded-full border border-[var(--border)] px-2 py-0.5 text-xs font-semibold text-[var(--muted-foreground)]">
                      Selesai
                    </span>
                  </div>
                </button>
            ) : null}
            {!sections.length ? (
              <p className="text-sm text-[var(--muted-foreground)]">Belum ada section pada course ini.</p>
            ) : null}
          </div>
        </aside>

        <article className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
          {showCertificatePanel ? (
            <div className="space-y-5">
              <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-8 text-center">
                <Award className="mx-auto size-14 text-[var(--primary)]" />
                <h2 className="mt-4 text-3xl font-semibold text-[var(--foreground)]">Selamat!</h2>
                <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">
                  Kamu sudah menyelesaikan kelas ini. Sebelum mengambil sertifikat, pastikan kamu benar-benar sudah
                  memahami keseluruhan materi yang dipelajari di kelas ini.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <a
                    href="#course-review-form"
                    className="inline-flex h-10 items-center rounded-md border border-[var(--border)] bg-[var(--card)] px-4 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-hover)]"
                  >
                    Review Kelas
                  </a>
                  {certificatePreviewHref ? (
                    <button
                      type="button"
                      onClick={handlePrintCertificate}
                      disabled={isPrintingCertificate}
                      className="inline-flex h-10 items-center rounded-md bg-[var(--secondary)] px-4 text-sm font-semibold text-[var(--secondary-foreground)] transition hover:opacity-90"
                    >
                      {isPrintingCertificate ? "Menyiapkan..." : "Cetak Sertifikat"}
                    </button>
                  ) : canClaimCertificate ? (
                    <button
                      type="button"
                      onClick={requestCertificateClaim}
                      disabled={generateCertificateMutation.isPending}
                      className="inline-flex h-10 items-center rounded-md bg-[var(--secondary)] px-4 text-sm font-semibold text-[var(--secondary-foreground)] transition hover:opacity-90 disabled:opacity-70"
                    >
                      {generateCertificateMutation.isPending ? "Menyiapkan..." : "Klaim Sertifikat"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="inline-flex h-10 items-center rounded-md border border-[var(--border)] px-4 text-sm font-semibold text-[var(--muted-foreground)] opacity-70"
                    >
                      Belum Bisa Klaim
                    </button>
                  )}
                </div>
              </section>

              <form
                id="course-review-form"
                className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5"
                onSubmit={(event) => {
                  event.preventDefault();
                  submitCourseReview();
                }}
              >
                <h3 className="text-xl font-semibold text-[var(--foreground)]">Berikan Ulasan Kelas</h3>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  Review ini membantu student lain memahami kualitas kelas.
                </p>
                <div className="mt-4 flex gap-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => setReviewRating(rating)}
                      disabled={!isCourseComplete}
                      className="rounded-md p-1 transition hover:scale-105 disabled:opacity-60"
                      aria-label={`Rating ${rating}`}
                    >
                      <Star
                        className={[
                          "size-8",
                          rating <= selectedReviewRating
                            ? "fill-[var(--secondary)] text-[var(--secondary)]"
                            : "text-zinc-300",
                        ].join(" ")}
                      />
                    </button>
                  ))}
                </div>
                <textarea
                  value={selectedReviewText}
                  onChange={(event) => setReviewText(event.target.value)}
                  disabled={!isCourseComplete}
                  rows={5}
                  placeholder="Tulis pengalaman belajar kamu di kelas ini."
                  className="mt-4 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-3 text-sm outline-none transition focus:border-[var(--secondary)] disabled:opacity-70"
                />
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="submit"
                    disabled={!isCourseComplete || reviewMutation.isPending}
                    className="inline-flex h-10 items-center rounded-md bg-[var(--secondary)] px-4 text-sm font-semibold text-[var(--secondary-foreground)] transition hover:opacity-90 disabled:opacity-70"
                  >
                    {reviewMutation.isPending
                      ? "Menyimpan..."
                      : currentUserReview
                        ? "Update Review"
                        : "Kirim Review"}
                  </button>
                  {currentUserReview ? (
                    <span className="text-sm text-[var(--muted-foreground)]">Review sebelumnya akan diperbarui.</span>
                  ) : null}
                </div>
              </form>
            </div>
          ) : activeLesson ? (
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
                  Quiz - Durasi: {formatQuizDuration(selectedQuiz.duration)}
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

              {quizAttemptsQuery.isSuccess ? (
                <div className="rounded-md border border-[var(--border)] bg-[var(--card)] p-4 text-sm text-[var(--foreground)]">
                  <p className="font-medium">Riwayat Attempt</p>
                  {quizAttemptsQuery.data.length ? (
                    <div className="mt-3 space-y-2">
                      {quizAttemptsQuery.data.map((attempt, index) => (
                        <div
                          key={attempt.id}
                          className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 px-3 py-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-medium text-[var(--foreground)]">
                              Attempt #{quizAttemptsQuery.data.length - index}
                            </p>
                            <div className="flex flex-wrap items-center gap-2">
                              {index === 0 ? (
                                <span className="inline-flex rounded-full bg-[var(--secondary)] px-2 py-0.5 text-[11px] font-semibold text-[var(--secondary-foreground)]">
                                  Terbaru
                                </span>
                              ) : null}
                              <Link
                                href={buildStudentQuizAttemptHref(enrollmentId, selectedQuiz.id, attempt.id)}
                                className={getStudentQuizAttemptLinkClass(
                                  attempt,
                                  selectedQuiz.passing_score,
                                )}
                              >
                                {getStudentQuizAttemptLinkLabel(attempt)}
                              </Link>
                            </div>
                          </div>
                          <div className="mt-2 grid gap-1 text-xs text-[var(--muted-foreground)] sm:grid-cols-3">
                            <p>Status: {formatQuizAttemptStatus(attempt.status)}</p>
                            <p>
                              Score: {attempt.total_score}
                              {selectedQuiz.passing_score ? ` / ${selectedQuiz.passing_score}` : ""}
                            </p>
                            <p>
                              Waktu: {formatUtcDateTimeToJakarta(attempt.submitted_at ?? attempt.started_at)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-[var(--muted-foreground)]">Belum ada attempt untuk quiz ini.</p>
                  )}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3">
                {quizAttemptsQuery.isLoading ? (
                  <span className="inline-flex h-10 items-center rounded-md bg-[var(--secondary)] px-4 text-sm font-medium text-[var(--secondary-foreground)] opacity-70">
                    Memuat Quiz...
                  </span>
                ) : null}
                {quizActionLabel === "Mulai Quiz" || quizActionLabel === "Mulai Quiz Lagi" ? (
                  <button
                    type="button"
                    onClick={() => selectedQuiz && startQuizMutation.mutate(selectedQuiz.id)}
                    disabled={startQuizMutation.isPending}
                    className="inline-flex h-10 items-center rounded-md bg-[var(--secondary)] px-4 text-sm font-medium text-[var(--secondary-foreground)] transition hover:opacity-90 disabled:opacity-70"
                  >
                    {startQuizMutation.isPending ? "Menyiapkan Quiz..." : quizActionLabel}
                  </button>
                ) : null}
                {quizAttemptsQuery.isError ? (
                  <p className="text-sm text-red-600">Status attempt quiz belum bisa dimuat.</p>
                ) : null}
                {isCooldownActive ? (
                  <p className="text-sm text-[var(--muted-foreground)]">
                    Quiz bisa dimulai lagi dalam {cooldownLabel}.
                  </p>
                ) : null}
              </div>
            </div>
          ) : activeAssignment ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-semibold text-[var(--foreground)]">{activeAssignment.title}</h2>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  Assignment
                  {activeAssignment.due_at
                    ? ` - Deadline: ${formatUtcDateTimeToJakarta(activeAssignment.due_at)}`
                    : ""}
                </p>
              </div>

              <div className="rounded-md border border-[var(--border)] bg-[var(--muted)] p-4 text-sm text-[var(--foreground)]">
                <p className="font-medium">Detail Assignment</p>
                <p className="mt-1 text-[var(--muted-foreground)]">
                  {activeAssignment.description || "Assignment ini belum memiliki deskripsi."}
                </p>
                <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-[var(--muted-foreground)] sm:grid-cols-2 xl:grid-cols-4">
                  <p>Max attempts: {activeAssignment.max_attempts ?? "Tidak dibatasi"}</p>
                  <p>Resubmission: {activeAssignment.allow_resubmission ? "Diizinkan" : "Tidak"}</p>
                  <p>Sertifikat: {activeAssignment.is_required_for_certificate ? "Wajib" : "Opsional"}</p>
                  <p>
                    Attempts tersisa:{" "}
                    {remainingAssignmentAttempts === null ? "Tidak dibatasi" : remainingAssignmentAttempts}
                  </p>
                </div>
              </div>

              {assignmentsQuery.isSuccess ? (
                <div className="rounded-md border border-[var(--border)] bg-[var(--card)] p-4 text-sm text-[var(--foreground)]">
                  <p className="font-medium">Riwayat Submission</p>
                  {assignmentDetailQuery.isLoading ? (
                    <p className="mt-2 text-[var(--muted-foreground)]">Memuat riwayat submission...</p>
                  ) : assignmentSubmissions.length ? (
                    <div className="mt-3 space-y-2">
                      {assignmentSubmissions.map((submission, index) => (
                        <div
                          key={submission.id}
                          className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 px-3 py-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-medium text-[var(--foreground)]">
                              Attempt #{submission.attempt_no}
                            </p>
                            <div className="flex flex-wrap items-center gap-2">
                              {index === 0 ? (
                                <span className="inline-flex rounded-full bg-[var(--secondary)] px-2 py-0.5 text-[11px] font-semibold text-[var(--secondary-foreground)]">
                                  Terbaru
                                </span>
                              ) : null}
                              <Link
                                href={buildStudentAssignmentHref(
                                  enrollmentId,
                                  activeAssignment?.id ?? submission.assignment_id,
                                  submission.id,
                                )}
                                className={getAssignmentSubmissionLinkClass(submission.status)}
                              >
                                Lihat Submission
                              </Link>
                            </div>
                          </div>
                          <div className="mt-2 grid gap-1 text-xs text-[var(--muted-foreground)] sm:grid-cols-3">
                            <p>Status: {formatAssignmentStatus(submission.status)}</p>
                            <p>Reviewer: {submission.reviewer_name || "-"}</p>
                            <p>Dikirim: {formatUtcDateTimeToJakarta(submission.submitted_at)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : assignmentDetailQuery.isError ? (
                    <p className="mt-2 text-red-600">Riwayat submission belum bisa dimuat.</p>
                  ) : (
                    <p className="mt-2 text-[var(--muted-foreground)]">Belum ada submission untuk assignment ini.</p>
                  )}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3">
                {assignmentsQuery.isLoading ? (
                  <span className="inline-flex h-10 items-center rounded-md bg-[var(--secondary)] px-4 text-sm font-medium text-[var(--secondary-foreground)] opacity-70">
                    Memuat Assignment...
                  </span>
                ) : null}
                {activeAssignment && assignmentPrimaryActionLabel ? (
                  <Link
                    href={buildStudentAssignmentHref(enrollmentId, activeAssignment.id)}
                    className={[
                      "inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium transition hover:opacity-90",
                      latestAssignmentSubmission?.status === "revision_required"
                        ? "border-rose-200 bg-rose-50 text-rose-700"
                        : "border-[var(--secondary)] bg-[var(--secondary)] text-[var(--secondary-foreground)]",
                    ].join(" ")}
                  >
                    {assignmentPrimaryActionLabel}
                  </Link>
                ) : null}
                {assignmentsQuery.isError ? (
                  <p className="text-sm text-red-600">Status assignment belum bisa dimuat.</p>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--muted-foreground)]">
              Pilih lesson, quiz, atau assignment untuk mulai belajar.
            </p>
          )}
        </article>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href={`/student/enrollments/${enrollmentId}`} className="text-sm text-primary hover:underline">
          Kembali ke detail kelas
        </Link>
        <Link href="/student/enrollments" className="text-sm text-primary hover:underline">
          Kembali ke Kelas Saya
        </Link>
      </div>

      <ConfirmAlertDialog
        open={showMarkCompleteConfirm}
        title="Tandai lesson selesai?"
        description="Progress lesson ini akan ditandai selesai untuk kelas Anda."
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

      <ConfirmAlertDialog
        open={showClaimCertificateConfirm}
        title="Klaim sertifikat sekarang?"
        description="Pastikan Anda sudah memahami keseluruhan materi kelas. Setelah diklaim, sertifikat akan dibuat dan siap diunduh dari halaman ini."
        confirmLabel="Ya, klaim sertifikat"
        cancelLabel="Nanti saja"
        confirmTone="primary"
        isPending={generateCertificateMutation.isPending}
        onClose={() => setShowClaimCertificateConfirm(false)}
        onConfirm={() => generateCertificateMutation.mutate()}
      />
    </section>
  );
}
