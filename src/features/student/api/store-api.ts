import { ApiError } from "@/lib/api/client";
import type {
  StoreAssignment,
  StoreAssignmentSubmission,
  StoreCertificate,
  StoreCourse,
  StoreCourseCurriculum,
  StoreEnrollment,
  StoreEnrollmentLessonDetail,
  StoreEnrollmentProgressSummary,
  StoreForumPost,
  StoreForumReply,
  StoreLesson,
  StoreLessonProgress,
  StoreOrder,
  StorePaginationMeta,
  StoreQuizAnswer,
  StoreQuizAttempt,
  StoreQuizDetail,
  StoreReview,
} from "@/types/store";

interface StudentApiEnvelope<T> {
  success?: boolean;
  message?: string;
  data?: T;
  meta?: StorePaginationMeta;
  errors?: Record<string, string[] | number[]>;
}

async function studentRequest<T>(endpoint: string, init: RequestInit): Promise<T> {
  const payload = await studentRequestEnvelope<T>(endpoint, init);
  return payload.data as T;
}

async function studentRequestEnvelope<T>(
  endpoint: string,
  init: RequestInit,
): Promise<StudentApiEnvelope<T>> {
  const response = await fetch(endpoint, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers || {}),
    },
  });

  const payload = (await response
    .json()
    .catch(() => null)) as StudentApiEnvelope<T> | null;

  if (!response.ok || !payload?.success) {
    throw new ApiError(
      payload?.message ?? `Request failed with status ${response.status}`,
      response.status,
      payload?.errors,
    );
  }

  return payload;
}

export function getPublishedCourses() {
  return studentRequest<StoreCourse[]>("/api/public/courses", { method: "GET" });
}

export function getPublishedCourseBySlug(slug: string) {
  return studentRequest<StoreCourse>(`/api/public/courses/${slug}`, { method: "GET" });
}

export function getStudentCart() {
  return studentRequest<StoreOrder | null>("/api/student/cart", { method: "GET" });
}

export function applyStudentCartVoucher(voucherCode: string) {
  return studentRequest<StoreOrder>("/api/student/cart/apply-voucher", {
    method: "POST",
    body: JSON.stringify({ voucher_code: voucherCode }),
  });
}

export function addCourseToCart(courseId: number) {
  return studentRequest<StoreOrder>("/api/student/cart/items", {
    method: "POST",
    body: JSON.stringify({ course_id: courseId }),
  });
}

export function removeCourseFromCart(courseId: number) {
  return studentRequest<StoreOrder | null>(`/api/student/cart/items/${courseId}`, {
    method: "DELETE",
  });
}

export function checkoutCart(payload: {
  voucher_code?: string;
  note?: string;
  payment_reference?: string;
  payment_proof?: string;
  payment_method: "manual";
}) {
  return studentRequest<StoreOrder>("/api/student/cart/checkout", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getStudentOrders() {
  return studentRequest<StoreOrder[]>("/api/student/orders", { method: "GET" });
}

export function getStudentOrderById(orderId: number) {
  return studentRequest<StoreOrder>(`/api/student/orders/${orderId}`, { method: "GET" });
}

export function submitStudentPayment(orderId: number, payload: {
  payment_reference?: string;
  payment_proof?: string;
}) {
  return studentRequest<StoreOrder>(`/api/student/orders/${orderId}/payment-submission`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function getStudentEnrollments() {
  return studentRequest<StoreEnrollment[]>("/api/student/enrollments", { method: "GET" });
}

export function getStudentEnrollmentById(enrollmentId: number) {
  return studentRequest<StoreEnrollment>(`/api/student/enrollments/${enrollmentId}`, { method: "GET" });
}

export function getStudentEnrollmentProgressSummary(enrollmentId: number) {
  return studentRequest<StoreEnrollmentProgressSummary>(
    `/api/student/enrollments/${enrollmentId}/progress-summary`,
    { method: "GET" },
  );
}

export function getStudentEnrollmentNextLesson(enrollmentId: number) {
  return studentRequest<StoreLesson | null>(
    `/api/student/enrollments/${enrollmentId}/next-lesson`,
    { method: "GET" },
  );
}

export function completeStudentEnrollment(enrollmentId: number) {
  return studentRequest<StoreEnrollment>(
    `/api/student/enrollments/${enrollmentId}/complete`,
    { method: "POST" },
  );
}

export async function getStudentEnrollmentCertificate(enrollmentId: number) {
  try {
    return await studentRequest<StoreCertificate>(
      `/api/student/enrollments/${enrollmentId}/certificate`,
      { method: "GET" },
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }

    throw error;
  }
}

export function getStudentCertificates() {
  return studentRequest<StoreCertificate[]>("/api/student/certificates", { method: "GET" });
}

export function generateStudentEnrollmentCertificate(enrollmentId: number) {
  return studentRequest<StoreCertificate>(
    `/api/student/enrollments/${enrollmentId}/certificate`,
    { method: "POST" },
  );
}

export function getStudentCourseReviews(courseId: number) {
  return studentRequest<StoreReview[]>(`/api/student/courses/${courseId}/reviews`, { method: "GET" });
}

export async function getStudentCourseForumPosts(courseId: number, page = 1) {
  const payload = await studentRequestEnvelope<StoreForumPost[]>(
    `/api/student/courses/${courseId}/forum?page=${page}`,
    { method: "GET" },
  );

  return {
    items: payload.data ?? [],
    meta: payload.meta ?? null,
  };
}

export function getStudentCourseForumPost(courseId: number, postId: number) {
  return studentRequest<StoreForumPost>(`/api/student/courses/${courseId}/forum/${postId}`, {
    method: "GET",
  });
}

export function createStudentCourseForumPost(
  courseId: number,
  payload: {
    title: string;
    content: string;
  },
) {
  return studentRequest<StoreForumPost>(`/api/student/courses/${courseId}/forum`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function createStudentCourseForumReply(
  courseId: number,
  postId: number,
  payload: {
    content: string;
  },
) {
  return studentRequest<StoreForumReply>(`/api/student/courses/${courseId}/forum/${postId}/replies`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function createStudentCourseReview(
  courseId: number,
  payload: {
    rating: number;
    review?: string | null;
  },
) {
  return studentRequest<StoreReview>(`/api/student/courses/${courseId}/reviews`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateStudentCourseReview(
  courseId: number,
  reviewId: number,
  payload: {
    rating: number;
    review?: string | null;
  },
) {
  return studentRequest<StoreReview>(`/api/student/courses/${courseId}/reviews/${reviewId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function getStudentEnrollmentCurriculum(enrollmentId: number) {
  return studentRequest<StoreCourseCurriculum>(
    `/api/student/enrollments/${enrollmentId}/curriculum`,
    { method: "GET" },
  );
}

export function getStudentEnrollmentLessonDetail(enrollmentId: number, lessonId: number) {
  return studentRequest<StoreEnrollmentLessonDetail>(
    `/api/student/enrollments/${enrollmentId}/lessons/${lessonId}`,
    { method: "GET" },
  );
}

export function getStudentEnrollmentAssignments(enrollmentId: number) {
  return studentRequest<StoreAssignment[]>(
    `/api/student/enrollments/${enrollmentId}/assignments`,
    { method: "GET" },
  );
}

export function getStudentEnrollmentAssignmentDetail(enrollmentId: number, assignmentId: number) {
  return studentRequest<StoreAssignment>(
    `/api/student/enrollments/${enrollmentId}/assignments/${assignmentId}`,
    { method: "GET" },
  );
}

export function submitStudentAssignment(
  enrollmentId: number,
  assignmentId: number,
  payload: {
    submission_text?: string;
    attachment_url?: string;
  },
) {
  return studentRequest<StoreAssignmentSubmission>(
    `/api/student/enrollments/${enrollmentId}/assignments/${assignmentId}/submit`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function getStudentEnrollmentQuizDetail(enrollmentId: number, quizId: number) {
  return studentRequest<StoreQuizDetail>(
    `/api/student/enrollments/${enrollmentId}/quizzes/${quizId}`,
    { method: "GET" },
  );
}

export function getStudentQuizAttempts(enrollmentId: number, quizId: number) {
  return studentRequest<StoreQuizAttempt[]>(
    `/api/student/enrollments/${enrollmentId}/quizzes/${quizId}/attempts`,
    { method: "GET" },
  );
}

export function startStudentQuizAttempt(enrollmentId: number, quizId: number) {
  return studentRequest<StoreQuizAttempt>(
    `/api/student/enrollments/${enrollmentId}/quizzes/${quizId}/attempts`,
    { method: "POST" },
  );
}

export function getStudentQuizAttempt(enrollmentId: number, quizId: number, attemptId: number) {
  return studentRequest<StoreQuizAttempt>(
    `/api/student/enrollments/${enrollmentId}/quizzes/${quizId}/attempts/${attemptId}`,
    { method: "GET" },
  );
}

export function upsertStudentQuizAnswer(
  enrollmentId: number,
  quizId: number,
  attemptId: number,
  questionId: number,
  payload: {
    selected_option_id: number;
  },
) {
  return studentRequest<StoreQuizAnswer>(
    `/api/student/enrollments/${enrollmentId}/quizzes/${quizId}/attempts/${attemptId}/answers/${questionId}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
  );
}

export function submitStudentQuizAttempt(enrollmentId: number, quizId: number, attemptId: number) {
  return studentRequest<StoreQuizAttempt>(
    `/api/student/enrollments/${enrollmentId}/quizzes/${quizId}/attempts/${attemptId}/submit`,
    { method: "POST" },
  );
}

export function getStudentLessonProgressList(enrollmentId: number) {
  return studentRequest<StoreLessonProgress[]>(
    `/api/student/enrollments/${enrollmentId}/lesson-progress`,
    { method: "GET" },
  );
}

export function upsertStudentLessonProgress(
  enrollmentId: number,
  lessonId: number,
  payload: {
    progress_seconds?: number;
    completed_at?: string | null;
  },
) {
  return studentRequest<StoreLessonProgress>(
    `/api/student/enrollments/${enrollmentId}/lesson-progress/${lessonId}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
  );
}
