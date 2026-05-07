import { ApiError } from "@/lib/api/client";
import type {
  StoreCourse,
  StoreCourseCurriculum,
  StoreEnrollment,
  StoreEnrollmentLessonDetail,
  StoreEnrollmentProgressSummary,
  StoreLesson,
  StoreLessonProgress,
  StoreOrder,
} from "@/types/store";

interface StudentApiEnvelope<T> {
  success?: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[] | number[]>;
}

async function studentRequest<T>(endpoint: string, init: RequestInit): Promise<T> {
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

  return payload.data as T;
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
