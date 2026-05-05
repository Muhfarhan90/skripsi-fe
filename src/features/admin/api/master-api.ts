import { apiMessageOnly, apiRequest } from "@/lib/api/client";

export interface AdminRole {
  id: number;
  name: string;
}

export interface AdminCategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
}

export interface AdminCourse {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  category_id: number;
  instructor_id: number;
  price: string | number;
  discount_price: string | number | null;
  thumbnail: string | null;
  status: "draft" | "published" | "archived";
  requirements: string | null;
  outcomes: string | null;
  created_at: string;
}

export interface AdminSection {
  id: number;
  course_id: number;
  title: string;
  sort_order: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface AdminCourseCurriculumLesson {
  id: number;
  section_id: number;
  title: string;
  description: string | null;
  type: "video" | "file";
  lesson_url: string | null;
  duration: number;
  sort_order: number;
  is_preview: boolean;
}

export interface AdminCourseCurriculumSection {
  id: number;
  course_id: number;
  title: string;
  sort_order: number;
  lessons: AdminCourseCurriculumLesson[];
  quizzes: AdminQuiz[];
}

export interface AdminCourseCurriculum {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  category_id: number;
  instructor_id: number;
  price: string | number;
  discount_price: string | number | null;
  thumbnail: string | null;
  status: "draft" | "published" | "archived";
  requirements: string | null;
  outcomes: string | null;
  sections: AdminCourseCurriculumSection[];
  created_at: string | null;
  updated_at: string | null;
}

export interface AdminQuiz {
  id: number;
  course_id: number;
  section_id: number;
  title: string;
  description: string | null;
  duration: number | null;
  passing_score: number | null;
  weight: number | null;
  is_active: boolean;
  is_random: boolean;
  max_attempts: number | null;
  questions?: AdminQuestion[];
  created_at: string | null;
  updated_at: string | null;
}

export interface AdminQuestion {
  id: number;
  quiz_id: number;
  question_text: string;
  image_url: string | null;
  type: "multiple_choice" | "true_false" | "short_answer";
  score: number | null;
  sort_order: number | null;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
  options: AdminOption[];
}

export interface AdminOption {
  id: number;
  question_id: number;
  option_text: string;
  image_url: string | null;
  is_correct: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface AdminVoucher {
  id: number;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_amount: string | number;
  min_purchase: string | number | null;
  max_discount: string | number | null;
  usage_limit: number | null;
  is_active: boolean;
  expired_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface AdminUser {
  id: number;
  role_id: number;
  fullname: string;
  email: string;
  nisn: string | null;
  phone: string | null;
  address: string | null;
  avatar: string | null;
  gender: "laki-laki" | "perempuan" | null;
  bio: string | null;
  date_of_birth: string | null;
  school_origin: string | null;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface CategoryPayload {
  name: string;
  description?: string | null;
}

export interface CoursePayload {
  title: string;
  description?: string | null;
  category_id: number;
  instructor_id: number;
  price: number;
  discount_price?: number | null;
  status: "draft" | "published" | "archived";
  requirements?: string | null;
  outcomes?: string | null;
}

export interface QuizPayload {
  course_id: number;
  section_id: number;
  title: string;
  description?: string | null;
  duration?: number | null;
  passing_score?: number | null;
  weight?: number | null;
  is_active?: boolean;
  is_random?: boolean;
  max_attempts?: number | null;
}

export interface QuestionPayload {
  quiz_id?: number;
  question_text: string;
  image_url?: string | null;
  type: "multiple_choice" | "true_false" | "short_answer";
  score?: number | null;
  sort_order?: number | null;
  is_active?: boolean;
}

export interface OptionPayload {
  question_id?: number;
  option_text: string;
  image_url?: string | null;
  is_correct: boolean;
}

export interface VoucherPayload {
  code: string;
  discount_type: "percentage" | "fixed";
  discount_amount: number;
  min_purchase?: number | null;
  max_discount?: number | null;
  usage_limit?: number | null;
  is_active?: boolean;
  expired_at?: string | null;
}

export interface CourseCurriculumLessonPayload {
  id?: number;
  title: string;
  description?: string | null;
  type: "video" | "file";
  lesson_url?: string | null;
  duration?: number;
  sort_order?: number;
  is_preview?: boolean;
}

export interface CourseCurriculumSectionPayload {
  id?: number;
  title: string;
  sort_order?: number;
  lessons?: CourseCurriculumLessonPayload[];
}

export interface CourseCurriculumPayload {
  course?: Partial<CoursePayload>;
  sections?: CourseCurriculumSectionPayload[];
}

export interface SectionPayload {
  course_id: number;
  title: string;
  sort_order?: number | null;
  is_locked?: boolean;
}

export interface LessonPayload {
  section_id: number;
  title: string;
  description?: string | null;
  type: "video" | "file";
  lesson_url?: string | null;
  duration?: number | null;
  sort_order?: number | null;
  is_preview?: boolean;
}

export interface UserPayload {
  role_id: number;
  fullname: string;
  email: string;
  password?: string;
  password_confirmation?: string;
  nisn?: string | null;
  is_active?: boolean;
  phone?: string | null;
  address?: string | null;
  avatar?: string | null;
  school_origin?: string | null;
  gender?: "laki-laki" | "perempuan" | null;
  bio?: string | null;
  date_of_birth?: string | null;
}

function normalizePayload<T extends object>(payload: T): Record<string, unknown> {
  const source = payload as Record<string, unknown>;
  const normalized = Object.fromEntries(
    Object.entries(source).filter(([, value]) => value !== undefined),
  );

  Object.entries(normalized).forEach(([key, value]) => {
    if (typeof value === "string" && value.trim() === "") {
      normalized[key] = null;
    }
  });

  return normalized;
}

export function getAdminRoles() {
  return apiRequest<AdminRole[]>("/api/admin/roles", {
    method: "GET",
  });
}

export function getAdminUsers() {
  return apiRequest<AdminUser[]>("/api/admin/users", {
    method: "GET",
  });
}

export function getAdminUserById(id: number) {
  return apiRequest<AdminUser>(`/api/admin/users/${id}`, {
    method: "GET",
  });
}

export function createAdminUser(payload: UserPayload) {
  return apiRequest<AdminUser>("/api/admin/users", {
    method: "POST",
    body: JSON.stringify(normalizePayload(payload)),
  });
}

export function updateAdminUser(id: number, payload: UserPayload) {
  return apiRequest<AdminUser>(`/api/admin/users/${id}`, {
    method: "PUT",
    body: JSON.stringify(normalizePayload(payload)),
  });
}

export function deleteAdminUser(id: number) {
  return apiMessageOnly(`/api/admin/users/${id}`, {
    method: "DELETE",
  });
}

export function getAdminCategories() {
  return apiRequest<AdminCategory[]>("/api/admin/categories", {
    method: "GET",
  });
}

export function createAdminCategory(payload: CategoryPayload) {
  return apiRequest<AdminCategory>("/api/admin/categories", {
    method: "POST",
    body: JSON.stringify(normalizePayload(payload)),
  });
}

export function updateAdminCategory(id: number, payload: CategoryPayload) {
  return apiRequest<AdminCategory>(`/api/admin/categories/${id}`, {
    method: "PUT",
    body: JSON.stringify(normalizePayload(payload)),
  });
}

export function deleteAdminCategory(id: number) {
  return apiMessageOnly(`/api/admin/categories/${id}`, {
    method: "DELETE",
  });
}

export function getAdminCourses() {
  return apiRequest<AdminCourse[]>("/api/admin/courses", {
    method: "GET",
  });
}

export function getAdminSections() {
  return apiRequest<AdminSection[]>("/api/admin/sections", {
    method: "GET",
  });
}

export function getAdminSectionById(id: number) {
  return apiRequest<AdminSection>(`/api/admin/sections/${id}`, {
    method: "GET",
  });
}

export function createAdminSection(payload: SectionPayload) {
  return apiRequest<AdminSection>("/api/admin/sections", {
    method: "POST",
    body: JSON.stringify(normalizePayload(payload)),
  });
}

export function updateAdminSection(id: number, payload: Partial<SectionPayload>) {
  return apiRequest<AdminSection>(`/api/admin/sections/${id}`, {
    method: "PUT",
    body: JSON.stringify(normalizePayload(payload)),
  });
}

export function deleteAdminSection(id: number) {
  return apiMessageOnly(`/api/admin/sections/${id}`, {
    method: "DELETE",
  });
}

export function getAdminLessonById(id: number) {
  return apiRequest<AdminCourseCurriculumLesson>(`/api/admin/lessons/${id}`, {
    method: "GET",
  });
}

export function createAdminLesson(payload: LessonPayload) {
  return apiRequest<AdminCourseCurriculumLesson>("/api/admin/lessons", {
    method: "POST",
    body: JSON.stringify(normalizePayload(payload)),
  });
}

export function updateAdminLesson(id: number, payload: Partial<LessonPayload>) {
  return apiRequest<AdminCourseCurriculumLesson>(`/api/admin/lessons/${id}`, {
    method: "PUT",
    body: JSON.stringify(normalizePayload(payload)),
  });
}

export function deleteAdminLesson(id: number) {
  return apiMessageOnly(`/api/admin/lessons/${id}`, {
    method: "DELETE",
  });
}

export function getAdminCourseById(id: number) {
  return apiRequest<AdminCourse>(`/api/admin/courses/${id}`, {
    method: "GET",
  });
}

export function getAdminCourseCurriculum(id: number) {
  return apiRequest<AdminCourseCurriculum>(`/api/admin/courses/${id}/curriculum`, {
    method: "GET",
  });
}

export function createAdminCourse(payload: CoursePayload) {
  return apiRequest<AdminCourse>("/api/admin/courses", {
    method: "POST",
    body: JSON.stringify(normalizePayload(payload)),
  });
}

export function updateAdminCourse(id: number, payload: CoursePayload) {
  return apiRequest<AdminCourse>(`/api/admin/courses/${id}`, {
    method: "PUT",
    body: JSON.stringify(normalizePayload(payload)),
  });
}

export function upsertAdminCourseCurriculum(id: number, payload: CourseCurriculumPayload) {
  return apiRequest<AdminCourseCurriculum>(`/api/admin/courses/${id}/curriculum`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteAdminCourse(id: number) {
  return apiMessageOnly(`/api/admin/courses/${id}`, {
    method: "DELETE",
  });
}

export function getAdminQuizzes() {
  return apiRequest<AdminQuiz[]>("/api/admin/quizzes", {
    method: "GET",
  });
}

export function getAdminCourseQuizzes(courseId: number) {
  return apiRequest<AdminQuiz[]>(`/api/admin/courses/${courseId}/quizzes`, {
    method: "GET",
  });
}

export function getAdminQuizDetail(quizId: number) {
  return apiRequest<AdminQuiz>(`/api/admin/quizzes/${quizId}`, {
    method: "GET",
  });
}

export function createAdminQuiz(payload: QuizPayload) {
  return apiRequest<AdminQuiz>("/api/admin/quizzes", {
    method: "POST",
    body: JSON.stringify(normalizePayload(payload)),
  });
}

export function createAdminCourseSectionQuiz(
  courseId: number,
  sectionId: number,
  payload: Omit<QuizPayload, "course_id" | "section_id">,
) {
  return apiRequest<AdminQuiz>(`/api/admin/courses/${courseId}/sections/${sectionId}/quizzes`, {
    method: "POST",
    body: JSON.stringify(normalizePayload(payload)),
  });
}

export function updateAdminCourseSectionQuiz(
  courseId: number,
  sectionId: number,
  quizId: number,
  payload: Omit<QuizPayload, "course_id" | "section_id">,
) {
  return apiRequest<AdminQuiz>(`/api/admin/courses/${courseId}/sections/${sectionId}/quizzes/${quizId}`, {
    method: "PUT",
    body: JSON.stringify(normalizePayload(payload)),
  });
}

export function updateAdminQuiz(id: number, payload: QuizPayload) {
  return apiRequest<AdminQuiz>(`/api/admin/quizzes/${id}`, {
    method: "PUT",
    body: JSON.stringify(normalizePayload(payload)),
  });
}

export function deleteAdminQuiz(id: number) {
  return apiMessageOnly(`/api/admin/quizzes/${id}`, {
    method: "DELETE",
  });
}

export function getAdminQuestions() {
  return apiRequest<AdminQuestion[]>("/api/admin/questions", {
    method: "GET",
  });
}

export function createAdminQuestion(payload: QuestionPayload) {
  return apiRequest<AdminQuestion>("/api/admin/questions", {
    method: "POST",
    body: JSON.stringify(normalizePayload(payload)),
  });
}

export function createAdminQuizQuestion(quizId: number, payload: QuestionPayload) {
  return apiRequest<AdminQuestion>(`/api/admin/quizzes/${quizId}/questions`, {
    method: "POST",
    body: JSON.stringify(normalizePayload(payload)),
  });
}

export function updateAdminQuestion(id: number, payload: QuestionPayload) {
  return apiRequest<AdminQuestion>(`/api/admin/questions/${id}`, {
    method: "PUT",
    body: JSON.stringify(normalizePayload(payload)),
  });
}

export function updateAdminQuizQuestion(quizId: number, questionId: number, payload: QuestionPayload) {
  return apiRequest<AdminQuestion>(`/api/admin/quizzes/${quizId}/questions/${questionId}`, {
    method: "PUT",
    body: JSON.stringify(normalizePayload(payload)),
  });
}

export function reorderAdminQuizQuestions(quizId: number, questionIds: number[]) {
  return apiMessageOnly(`/api/admin/quizzes/${quizId}/questions/reorder`, {
    method: "PUT",
    body: JSON.stringify({
      question_ids: questionIds,
    }),
  });
}

export function deleteAdminQuestion(id: number) {
  return apiMessageOnly(`/api/admin/questions/${id}`, {
    method: "DELETE",
  });
}

export function deleteAdminQuizQuestion(quizId: number, questionId: number) {
  return apiMessageOnly(`/api/admin/quizzes/${quizId}/questions/${questionId}`, {
    method: "DELETE",
  });
}

export function getAdminOptions() {
  return apiRequest<AdminOption[]>("/api/admin/options", {
    method: "GET",
  });
}

export function createAdminOption(payload: OptionPayload) {
  return apiRequest<AdminOption>("/api/admin/options", {
    method: "POST",
    body: JSON.stringify(normalizePayload(payload)),
  });
}

export function createAdminQuestionOption(questionId: number, payload: OptionPayload) {
  return apiRequest<AdminOption>(`/api/admin/questions/${questionId}/options`, {
    method: "POST",
    body: JSON.stringify(normalizePayload(payload)),
  });
}

export function updateAdminOption(id: number, payload: OptionPayload) {
  return apiRequest<AdminOption>(`/api/admin/options/${id}`, {
    method: "PUT",
    body: JSON.stringify(normalizePayload(payload)),
  });
}

export function updateAdminQuestionOption(questionId: number, optionId: number, payload: OptionPayload) {
  return apiRequest<AdminOption>(`/api/admin/questions/${questionId}/options/${optionId}`, {
    method: "PUT",
    body: JSON.stringify(normalizePayload(payload)),
  });
}

export function deleteAdminOption(id: number) {
  return apiMessageOnly(`/api/admin/options/${id}`, {
    method: "DELETE",
  });
}

export function deleteAdminQuestionOption(questionId: number, optionId: number) {
  return apiMessageOnly(`/api/admin/questions/${questionId}/options/${optionId}`, {
    method: "DELETE",
  });
}

export function getAdminVouchers() {
  return apiRequest<AdminVoucher[]>("/api/admin/vouchers", {
    method: "GET",
  });
}

export function createAdminVoucher(payload: VoucherPayload) {
  return apiRequest<AdminVoucher>("/api/admin/vouchers", {
    method: "POST",
    body: JSON.stringify(normalizePayload(payload)),
  });
}

export function updateAdminVoucher(id: number, payload: VoucherPayload) {
  return apiRequest<AdminVoucher>(`/api/admin/vouchers/${id}`, {
    method: "PUT",
    body: JSON.stringify(normalizePayload(payload)),
  });
}

export function deleteAdminVoucher(id: number) {
  return apiMessageOnly(`/api/admin/vouchers/${id}`, {
    method: "DELETE",
  });
}
