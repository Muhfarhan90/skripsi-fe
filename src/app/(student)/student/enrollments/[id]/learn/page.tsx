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
  PanelLeftClose,
  PanelLeftOpen,
  Star,
  X,
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
  isAssignmentApproved,
} from "@/features/student/lib/assignment";
import {
  buildStudentQuizAttemptHref,
  formatQuizAttemptStatus,
  formatQuizDuration,
  getActiveQuizAttempt,
  hasPassedQuizAttempt,
  getLatestQuizAttempt,
  getStudentQuizAttemptLinkClass,
  getStudentQuizAttemptLinkLabel,
} from "@/features/student/lib/quiz";
import { printCertificatePreview } from "@/features/student/lib/certificate-print";
import { formatUtcDateTimeToJakarta, parseUtcDateTime } from "@/features/student/lib/date-time";
import { StudentCourseForumPanel } from "@/features/student/components/student-course-forum-panel";
import { resolvePublicFileUrl } from "@/lib/file-url";
import type {
  StoreAssignment,
  StoreCurriculumSection,
  StoreLesson,
  StoreQuiz,
  StoreQuizAttempt,
} from "@/types/store";

function toEmbeddableUrl(url: string): string {
  if (url.startsWith("/storage/") || url.startsWith("storage/")) {
    return resolvePublicFileUrl(url) || url;
  }

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
    return `${baseClass} border-emerald-500/30 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300`;
  }

  if (status === "revision_required") {
    return `${baseClass} border-rose-500/30 bg-rose-500/10 text-rose-700 hover:bg-rose-500/15 dark:text-rose-300`;
  }

  return `${baseClass} border-amber-500/30 bg-amber-500/10 text-amber-700 hover:bg-amber-500/15 dark:text-amber-300`;
}

type SelectedContent =
  | { kind: "lesson"; sectionId: number; data: StoreLesson }
  | { kind: "quiz"; sectionId: number; data: StoreQuiz }
  | { kind: "assignment"; sectionId: number; data: StoreAssignment };

type LearnPanelTab = "course_content" | "forum";

function isSameContent(left: SelectedContent, right: SelectedContent): boolean {
  return left.kind === right.kind && left.data.id === right.data.id;
}

function getOrderedLearningContents(sections: StoreCurriculumSection[]): SelectedContent[] {
  return sections.flatMap((section) => [
    ...(section.lessons ?? []).map((lesson) => ({
      kind: "lesson" as const,
      sectionId: section.id,
      data: lesson,
    })),
    ...(section.quizzes ?? []).map((quiz) => ({
      kind: "quiz" as const,
      sectionId: section.id,
      data: quiz,
    })),
    ...(section.assignments ?? []).map((assignment) => ({
      kind: "assignment" as const,
      sectionId: section.id,
      data: assignment,
    })),
  ]);
}

interface LessonMaterialFrameProps {
  title: string;
  src: string;
  type: StoreLesson["type"];
}

function LessonMaterialFrame({ title, src, type }: LessonMaterialFrameProps) {
  // Detect if the src points directly to an uploaded video file
  const isDirectVideo =
    src.startsWith("http")
      ? /\.(mp4|webm|ogg)(\?|$)/i.test(src)
      : src.startsWith("/storage/") || src.includes("/storage/lessons/");

  return (
    <div
      className={[
        "relative overflow-hidden rounded-md border border-[var(--border)] bg-black/5",
        type === "file" ? "h-[58vh] min-h-80 sm:h-[62vh] lg:h-[70vh]" : "aspect-video max-h-[70vh]",
      ].join(" ")}
    >
      {isDirectVideo ? (
        <video
          controls
          playsInline
          className="h-full w-full bg-black object-contain"
          title={title}
        >
          <source src={src} />
          Browser Anda tidak mendukung pemutaran video langsung.
        </video>
      ) : (
        <iframe
          title={title}
          src={src}
          className="h-full w-full bg-black/5"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
          allowFullScreen
        />
      )}
    </div>
  );
}

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
  isPassed: boolean,
): boolean {
  if (!quiz || !quiz.is_active || isPassed || getActiveQuizAttempt(attempts)) {
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

function buildLearnHref(enrollmentId: number, searchParams: URLSearchParams): string {
  const suffix = searchParams.toString();
  return suffix ? `/student/enrollments/${enrollmentId}/learn?${suffix}` : `/student/enrollments/${enrollmentId}/learn`;
}

export default function StudentEnrollmentLearnPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const enrollmentId = Number(params.id);
  const requestedPanel = searchParams.get("panel");
  const requestedTab = searchParams.get("tab");
  const [expandedSectionIds, setExpandedSectionIds] = useState<number[]>([]);
  const [selectedContent, setSelectedContent] = useState<SelectedContent | null>(null);
  const [activeLearnTab, setActiveLearnTab] = useState<LearnPanelTab>(() =>
    requestedTab === "forum" ? "forum" : "course_content",
  );
  const [isCourseContentSidebarHidden, setIsCourseContentSidebarHidden] = useState(false);
  const [isMobileCourseContentDrawerOpen, setIsMobileCourseContentDrawerOpen] = useState(false);
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
  const passedQuizIds = useMemo(
    () => new Set(summaryQuery.data?.passed_quiz_ids ?? []),
    [summaryQuery.data?.passed_quiz_ids],
  );
  const approvedAssignmentIds = useMemo(
    () => new Set(summaryQuery.data?.approved_assignment_ids ?? []),
    [summaryQuery.data?.approved_assignment_ids],
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
  const orderedLearningContents = useMemo(
    () => getOrderedLearningContents(sections),
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
  const nextLearningContent = useMemo(() => {
    if (!activeSelectedContent) {
      return null;
    }

    const currentIndex = orderedLearningContents.findIndex((item) =>
      isSameContent(item, activeSelectedContent),
    );

    if (currentIndex < 0) {
      return null;
    }

    return orderedLearningContents[currentIndex + 1] ?? null;
  }, [activeSelectedContent, orderedLearningContents]);
  const effectiveExpandedSectionIds = useMemo(() => {
    const availableIds = new Set(sections.map((section) => section.id));
    return expandedSectionIds.filter((sectionId) => availableIds.has(sectionId));
  }, [expandedSectionIds, sections]);

  useEffect(() => {
    const activeSectionId = activeSelectedContent?.sectionId ?? sections[0]?.id ?? null;
    if (!activeSectionId) {
      return;
    }

    setExpandedSectionIds((current) => {
      if (current.length || current.includes(activeSectionId)) {
        return current;
      }

      return [activeSectionId];
    });
  }, [activeSelectedContent?.sectionId, sections]);

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
  const activeLessonCompleted = activeLesson ? completedLessonIds.has(activeLesson.id) : false;
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
  const isSelectedQuizPassed = selectedQuiz
    ? passedQuizIds.has(selectedQuiz.id) || hasPassedQuizAttempt(quizAttempts, selectedQuiz.passing_score)
    : false;
  const cooldownDeadline = getQuizCooldownDeadline(latestQuizAttempt);
  const cooldownDeadlineMs = cooldownDeadline?.getTime() ?? null;
  const remainingCooldownMs =
    cooldownDeadlineMs !== null ? Math.max(cooldownDeadlineMs - nowMs, 0) : null;
  const isCooldownActive = remainingCooldownMs !== null && remainingCooldownMs > 0;
  const canStartSelectedQuiz = canStartQuizFromLearn(
    selectedQuiz,
    quizAttempts,
    isCooldownActive,
    isSelectedQuizPassed,
  );
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

  useEffect(() => {
    if (!isMobileCourseContentDrawerOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    const onKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMobileCourseContentDrawerOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeydown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeydown);
    };
  }, [isMobileCourseContentDrawerOpen]);

  if (curriculumQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Memuat materi course...</p>;
  }

  if (curriculumQuery.isError || !curriculumQuery.data) {
    return <p className="text-sm text-red-600">Materi course tidak bisa diakses.</p>;
  }

  const switchLearnTab = (nextTab: LearnPanelTab) => {
    setActiveLearnTab(nextTab);
    setIsMobileCourseContentDrawerOpen(false);

    const nextParams = new URLSearchParams(searchParams.toString());
    if (nextTab === "course_content") {
      nextParams.delete("tab");
    } else {
      nextParams.set("tab", nextTab);
    }

    router.replace(buildLearnHref(enrollmentId, nextParams), { scroll: false });
  };

  const toggleSection = (sectionId: number) => {
    setExpandedSectionIds((current) =>
      current.includes(sectionId)
        ? current.filter((item) => item !== sectionId)
        : [...current, sectionId],
    );
  };

  const selectContent = (content: SelectedContent) => {
    switchLearnTab("course_content");
    setActivePanel("content");
    setIsMobileCourseContentDrawerOpen(false);
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

    switchLearnTab("course_content");
    setActivePanel("certificate");
    setIsMobileCourseContentDrawerOpen(false);
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
                "w-full rounded-lg border px-2.5 py-2.5 text-left transition sm:rounded-xl sm:px-3 sm:py-3",
                isLocked
                  ? "cursor-not-allowed border-amber-500/30 bg-amber-500/10 opacity-75"
                  : isActive
                  ? "border-[var(--secondary)] bg-[var(--secondary)]/10"
                  : "border-[var(--border)] bg-[var(--muted)]/40 hover:bg-[var(--surface-hover)]",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-xs font-medium text-[var(--foreground)] sm:text-sm">
                    {lesson.type === "file" ? <FileText className="size-3.5 sm:size-4" /> : <CirclePlay className="size-3.5 sm:size-4" />}
                    <span className="truncate">{lesson.title}</span>
                  </p>
                  <p className="mt-1 text-[11px] text-[var(--muted-foreground)] sm:text-xs">
                    {formatLessonDuration(lesson.duration)}
                  </p>
                  {isLocked ? (
                    <p className="mt-1 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                      Selesaikan lesson sebelumnya dulu.
                    </p>
                  ) : null}
                </div>
                {isCompleted ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--secondary)] px-2 py-0.5 text-[10px] font-semibold text-[var(--secondary-foreground)] sm:text-xs">
                    <CheckCircle2 className="size-3.5" />
                    Selesai
                  </span>
                ) : isLocked ? (
                  <span className="inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300 sm:text-xs">
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
          const isCompleted = passedQuizIds.has(quiz.id);
          return (
            <button
              key={`quiz-${quiz.id}`}
              type="button"
              onClick={() => selectContent({ kind: "quiz", sectionId: section.id, data: quiz })}
              className={[
                "w-full rounded-lg border px-2.5 py-2.5 text-left transition sm:rounded-xl sm:px-3 sm:py-3",
                isActive
                  ? "border-[var(--secondary)] bg-[var(--secondary)]/10"
                  : "border-[var(--border)] bg-[var(--muted)]/40 hover:bg-[var(--surface-hover)]",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-xs font-medium text-[var(--foreground)] sm:text-sm">
                    <HelpCircle className="size-3.5 sm:size-4" />
                    <span className="truncate">{quiz.title}</span>
                  </p>
                  <p className="mt-1 text-[11px] text-[var(--muted-foreground)] sm:text-xs">
                    Quiz - Durasi: {formatLessonDuration(quiz.duration)}
                  </p>
                </div>
                <span
                  className={[
                    "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold sm:text-xs",
                    isCompleted
                      ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                      : "border border-[var(--border)] text-[var(--muted-foreground)]",
                  ].join(" ")}
                >
                  {isCompleted ? "Selesai" : "Quiz"}
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
          const isCompleted = approvedAssignmentIds.has(assignment.id) || isAssignmentApproved(currentAssignment);

          return (
            <button
              key={`assignment-${assignment.id}`}
              type="button"
              onClick={() => selectContent({ kind: "assignment", sectionId: section.id, data: assignment })}
              className={[
                "w-full rounded-lg border px-2.5 py-2.5 text-left transition sm:rounded-xl sm:px-3 sm:py-3",
                isActive
                  ? "border-[var(--secondary)] bg-[var(--secondary)]/10"
                  : "border-[var(--border)] bg-[var(--muted)]/40 hover:bg-[var(--surface-hover)]",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-xs font-medium text-[var(--foreground)] sm:text-sm">
                    <ClipboardList className="size-3.5 sm:size-4" />
                    <span className="truncate">{assignment.title}</span>
                  </p>
                  <p className="mt-1 text-[11px] text-[var(--muted-foreground)] sm:text-xs">
                    Assignment
                    {assignment.due_at ? ` - Deadline: ${formatUtcDateTimeToJakarta(assignment.due_at)}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span
                    className={[
                      "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold sm:text-xs",
                      isCompleted
                        ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                        : "border border-[var(--border)] text-[var(--muted-foreground)]",
                    ].join(" ")}
                  >
                    {isCompleted ? "Selesai" : "Assignment"}
                  </span>
                  {latestSubmission && !isCompleted ? (
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

  const renderTableOfContentsItems = (className = "mt-4 space-y-3") => (
    <div className={className}>
      {sections.map((section) => {
        const isExpanded = effectiveExpandedSectionIds.includes(section.id);

        return (
          <div key={section.id} className="rounded-lg border border-[var(--border)] bg-[var(--card)] sm:rounded-xl">
            <button
              type="button"
              onClick={() => toggleSection(section.id)}
              className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left sm:px-4 sm:py-3"
            >
              <span className="text-base text-[var(--foreground)] sm:text-lg">{section.title}</span>
              {isExpanded ? (
                <ChevronUp className="size-4 text-[var(--foreground)] sm:size-5" />
              ) : (
                <ChevronDown className="size-4 text-[var(--foreground)] sm:size-5" />
              )}
            </button>

            {isExpanded ? <div className="px-2.5 sm:px-3">{renderSectionItems(section)}</div> : null}
          </div>
        );
      })}
      {isCourseComplete ? (
        <button
          type="button"
          onClick={openCertificatePanel}
          className={[
            "w-full rounded-lg border px-3 py-2.5 text-left transition sm:rounded-xl sm:px-4 sm:py-3",
            showCertificatePanel
              ? "border-[var(--secondary)] bg-[var(--secondary)]/10"
              : "border-[var(--border)] bg-[var(--muted)]/40 hover:bg-[var(--surface-hover)]",
          ].join(" ")}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-xs font-medium text-[var(--foreground)] sm:text-sm">
                <Award className="size-3.5 sm:size-4" />
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
  );

  const renderCourseContentPanel = (className = "") => (
    <section className={["rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 shadow-sm sm:p-4", className].join(" ")}>
      <div className="mb-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--foreground)] sm:text-lg">Course Content</h2>
          <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
            Pilih materi, quiz, atau assignment untuk mengganti konten utama.
          </p>
        </div>
      </div>
      {isCourseContentSidebarHidden ? (
        <button
          type="button"
          onClick={() => setIsCourseContentSidebarHidden(false)}
          aria-label="Tampilkan sidebar"
          title="Tampilkan sidebar"
          className="mb-3 hidden size-9 items-center justify-center rounded-md border border-[var(--border)] text-[var(--foreground)] transition hover:bg-[var(--surface-hover)] lg:inline-flex"
        >
          <PanelLeftOpen className="size-4.5" />
        </button>
      ) : null}
      {renderTableOfContentsItems("space-y-2.5 sm:space-y-3")}
    </section>
  );

  const renderDescriptionPanel = (className = "") => (
    <section className={["space-y-4 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm", className].join(" ")}>
      <div>
        <h2 className="text-base font-semibold text-[var(--foreground)] sm:text-lg">Deskripsi Course</h2>
        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[var(--muted-foreground)]">
          {curriculumQuery.data.description || "Deskripsi course belum tersedia."}
        </p>
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] p-3">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">Konten Aktif</h3>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          {activeLesson?.description ||
            selectedQuiz?.description ||
            activeAssignment?.description ||
            "Konten aktif belum memiliki deskripsi tambahan."}
        </p>
      </div>
    </section>
  );

  return (
    <section className="space-y-5">
      <header className="px-1 py-1">
        <h1 className="text-2xl font-black tracking-tight text-foreground">{curriculumQuery.data.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pilih section, lalu pilih lesson, quiz, atau assignment. Urutan ditampilkan lesson dulu, lalu quiz, lalu assignment.
        </p>
      </header>

      {activeLearnTab === "course_content" ? (
        <div className="lg:hidden">
          <button
            type="button"
            onClick={() => setIsMobileCourseContentDrawerOpen(true)}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--card)] px-4 text-sm font-medium text-[var(--foreground)] shadow-sm transition hover:bg-[var(--surface-hover)]"
          >
            <PanelLeftOpen className="size-4" />
            <span>Daftar Materi</span>
          </button>
        </div>
      ) : null}

      <div className="space-y-4">
        <div className="border-b border-[var(--border)]/70 pb-px px-1">
          <div className="overflow-x-auto">
            <div className="flex min-w-max gap-1" role="tablist" aria-label="Course learning tabs">
              <button
                type="button"
                role="tab"
                aria-selected={activeLearnTab === "course_content"}
                onClick={() => switchLearnTab("course_content")}
                className={[
                  "relative inline-flex h-11 items-center gap-2 px-3 text-sm font-semibold transition after:absolute after:bottom-0 after:h-0.5 after:left-1 after:right-1",
                  activeLearnTab === "course_content"
                    ? "text-[var(--primary)] after:bg-[var(--primary)]"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] after:bg-transparent",
                ].join(" ")}
              >
                Materi
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeLearnTab === "forum"}
                onClick={() => switchLearnTab("forum")}
                className={[
                  "relative inline-flex h-11 items-center gap-2 px-3 text-sm font-semibold transition after:absolute after:bottom-0 after:h-0.5 after:left-1 after:right-1",
                  activeLearnTab === "forum"
                    ? "text-[var(--primary)] after:bg-[var(--primary)]"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] after:bg-transparent",
                ].join(" ")}
              >
                Forum Diskusi
              </button>
            </div>
          </div>
        </div>

        <div className="pt-2">
          {activeLearnTab === "course_content" ? (
            <div
              className={[
                "grid gap-4",
                isCourseContentSidebarHidden
                  ? "lg:grid-cols-1"
                  : "lg:grid-cols-[360px_minmax(0,1fr)]",
              ].join(" ")}
            >
              <div className="space-y-4">

                <article className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 shadow-sm sm:p-4">
            {showCertificatePanel ? (
              <div className="space-y-5">
              <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-8 text-center">
                <Award className="mx-auto size-14 text-[var(--primary)]" />
                <h2 className="mt-4 text-2xl font-semibold text-[var(--foreground)] sm:text-3xl">Selamat!</h2>
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
                <h2 className="text-xl font-semibold text-[var(--foreground)] sm:text-2xl">{activeLesson.title}</h2>
                <p className="text-xs text-[var(--muted-foreground)] sm:text-sm">Durasi: {formatLessonDuration(activeLesson.duration)}</p>
                {lessonDetailQuery.data?.section ? (
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                    Section: {lessonDetailQuery.data.section.title}
                  </p>
                ) : null}
              </div>

              {embedUrl ? (
                <LessonMaterialFrame
                  title={`Materi ${activeLesson.title}`}
                  src={embedUrl}
                  type={activeLesson.type}
                />
              ) : (
                <div className="rounded-md border border-[var(--border)] bg-[var(--muted)] p-4 text-sm text-[var(--muted-foreground)]">
                  Lesson ini belum memiliki URL materi.
                </div>
              )}

              <div className="flex flex-wrap justify-end gap-2">
                {activeLessonCompleted ? (
                  <span className="inline-flex h-9 items-center gap-2 rounded-md bg-[var(--primary)]/10 px-3 text-sm font-semibold text-[var(--primary)]">
                    <CheckCircle2 className="size-4" />
                    Lesson selesai
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowMarkCompleteConfirm(true)}
                    disabled={markCompleteMutation.isPending}
                    className="inline-flex h-9 items-center rounded-md bg-[var(--secondary)] px-3 text-sm font-medium text-[var(--secondary-foreground)] transition hover:opacity-90 disabled:opacity-70"
                  >
                    Tandai Selesai
                  </button>
                )}
                {activeLessonCompleted && nextLearningContent ? (
                  <button
                    type="button"
                    onClick={() => selectContent(nextLearningContent)}
                    className="inline-flex h-9 items-center rounded-md border border-[var(--secondary)] bg-[var(--secondary)] px-3 text-sm font-medium text-[var(--secondary-foreground)] transition hover:opacity-90"
                  >
                    Materi Berikutnya
                  </button>
                ) : null}
              </div>
              </div>
            ) : selectedQuiz ? (
              <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-[var(--foreground)] sm:text-2xl">{selectedQuiz.title}</h2>
                <p className="mt-1 text-xs text-[var(--muted-foreground)] sm:text-sm">
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
                {isSelectedQuizPassed ? (
                  <p className="text-sm text-emerald-600">
                    Quiz ini sudah lulus. Attempt baru tidak diperlukan.
                  </p>
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
                <h2 className="text-xl font-semibold text-[var(--foreground)] sm:text-2xl">{activeAssignment.title}</h2>
                <p className="mt-1 text-xs text-[var(--muted-foreground)] sm:text-sm">
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
                        ? "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300"
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

                {isCourseContentSidebarHidden ? renderCourseContentPanel("hidden lg:block") : null}
                {!isCourseContentSidebarHidden ? renderDescriptionPanel("hidden lg:block") : null}
              </div>

              {!isCourseContentSidebarHidden ? (
              <aside className="hidden lg:order-first lg:block">
                <div className="sticky top-4 max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div>
                      <h2 className="text-base font-semibold text-[var(--foreground)]">Course Content</h2>
                      <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">Daftar materi kelas</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCourseContentSidebarHidden(true);
                        switchLearnTab("course_content");
                      }}
                      aria-label="Sembunyikan sidebar"
                      title="Sembunyikan sidebar"
                      className="inline-flex size-8 items-center justify-center rounded-md border border-[var(--border)] text-[var(--muted-foreground)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
                    >
                      <PanelLeftClose className="size-4" />
                    </button>
                  </div>
                  {renderTableOfContentsItems("space-y-2.5")}
                </div>
              </aside>
              ) : null}
            </div>
          ) : (
            <StudentCourseForumPanel
              basePath={`/student/enrollments/${enrollmentId}/learn`}
              enrollmentId={enrollmentId}
              courseId={courseId ?? 0}
              courseTitle={curriculumQuery.data.title}
              renderDetailInPlace
            />
          )}
        </div>
      </div>

      {isMobileCourseContentDrawerOpen ? (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <div
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-[2px]"
            onClick={() => setIsMobileCourseContentDrawerOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-y-0 left-0 flex w-full max-w-[22rem] flex-col border-r border-[var(--border)] bg-[var(--card)] shadow-[0_20px_50px_-12px_rgba(15,23,42,0.45)]">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-4">
              <div>
                <h2 className="text-base font-semibold text-[var(--foreground)]">Daftar Materi</h2>
                <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                  {curriculumQuery.data.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileCourseContentDrawerOpen(false)}
                className="inline-flex size-8 items-center justify-center rounded-md border border-[var(--border)] text-[var(--muted-foreground)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
                aria-label="Tutup daftar materi"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="overflow-y-auto px-4 py-4">
              {renderTableOfContentsItems("space-y-2.5")}
            </div>
          </div>
        </div>
      ) : null}

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
        description="Pastikan Anda sudah memahami keseluruhan materi kelas. Setelah diklaim, sertifikat siap diunduh dari halaman ini."
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
