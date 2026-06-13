import { apiMessageOnly, apiPaginatedRequest, apiRequest } from "@/lib/api/client";
import type { ApiPaginationMeta } from "@/types/auth";
import type {
  WebsiteFaq,
  WebsiteFaqCategory,
  WebsiteFaqCategoryPayload,
  WebsiteFaqPayload,
  WebsiteHomeContent,
  WebsitePage,
  WebsitePagePayload,
  WebsiteSection,
  WebsiteSectionPayload,
  WebsiteSettingGlobal,
  WebsiteSettingPayload,
  WebsiteSocialLink,
  WebsiteSocialLinkPayload,
} from "@/types/website";

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

export interface AdminSkill {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
  courses_count?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface AdminCourse {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  category_id: number;
  category_name?: string | null;
  instructor_id: number;
  instructor_name?: string | null;
  price: string | number;
  discount_price: string | number | null;
  thumbnail: string | null;
  skills: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  requirements: string | null;
  outcomes: string | null;
  created_at: string;
}

export interface AdminAcademicPeriod {
  id: number;
  code: string | null;
  name: string | null;
  start_at: string | null;
  end_at: string | null;
  enrollment_open_at: string | null;
  enrollment_close_at: string | null;
  is_active: boolean;
  course_offerings_count: number | null;
  course_offerings?: Array<{
    id: number;
    course_id: number | null;
    academic_period_id: number | null;
    capacity: number | null;
    price: string | number | null;
    discount_price: string | number | null;
    is_active: boolean;
    enrollments_count: number | null;
    course: {
      id: number;
      title: string;
      slug: string;
      category: {
        id: number;
        name: string;
      } | null;
    } | null;
  }> | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface AdminCourseOffering {
  id: number;
  course_id: number | null;
  academic_period_id: number | null;
  capacity: number | null;
  price: string | number | null;
  discount_price: string | number | null;
  is_active: boolean;
  enrollments_count: number | null;
  course: {
    id: number;
    title: string;
    slug: string;
    category: {
      id: number;
      name: string;
    } | null;
    instructor?: {
      id: number;
      fullname: string;
    } | null;
  } | null;
  academic_period: {
    id: number;
    code: string | null;
    name: string | null;
    start_at: string | null;
    end_at: string | null;
    enrollment_open_at: string | null;
    enrollment_close_at: string | null;
    is_active: boolean;
  } | null;
  created_at?: string | null;
  updated_at?: string | null;
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
  assignments: AdminAssignment[];
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
  skills: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
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
  open_at: string | null;
  close_at: string | null;
  questions?: AdminQuestion[];
  created_at: string | null;
  updated_at: string | null;
}

export interface AdminAssignment {
  id: number;
  course_id: number | null;
  section_id: number | null;
  created_by: number | null;
  title: string | null;
  description: string | null;
  instructions: string | null;
  due_at: string | null;
  is_required_for_certificate: boolean;
  allow_resubmission: boolean;
  max_attempts: number | null;
  status: "draft" | "published" | "archived" | string | null;
  section?: {
    id: number | null;
    course_id: number | null;
    title: string | null;
  } | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface AdminForumUserSummary {
  id: number;
  fullname: string;
  email?: string | null;
  avatar: string | null;
}

export interface AdminForumReply {
  id: number;
  post_id: number;
  user_id: number;
  content: string;
  user?: AdminForumUserSummary | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface AdminForumPost {
  id: number;
  course_id: number;
  user_id: number;
  title: string;
  content: string;
  is_pinned: boolean;
  replies_count?: number | null;
  user?: AdminForumUserSummary | null;
  replies?: AdminForumReply[];
  created_at: string | null;
  updated_at: string | null;
}

export interface AdminCourseReview {
  id: number;
  user_id: number;
  course_id: number;
  enrollment_id: number | null;
  rating: number;
  review: string | null;
  user?: {
    id: number;
    fullname: string;
    email?: string | null;
    avatar?: string | null;
  } | null;
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
  role_name: string | null;
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
  orders_count?: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface AdminOrderItem {
  course_id: number | null;
  course_offering_id?: number | null;
  price: number;
  course?: {
    id: number;
    title: string;
  } | null;
  course_offering?: {
    id: number;
    course_id: number;
    academic_period_id: number | null;
    title?: string | null;
    capacity: number | null;
    price: number | string | null;
    discount_price: number | string | null;
    is_active: boolean;
  } | null;
}

export interface AdminOrder {
  id: number;
  user_id: number;
  order_code: string;
  subtotal: number;
  discount: number;
  grand_total: number;
  status: "pending" | "completed" | "cancelled";
  note: string | null;
  created_at: string | null;
  user?: {
    id: number;
    fullname: string;
    email: string;
  };
  items: AdminOrderItem[];
  transactions?: AdminOrderTransaction[];
}

export interface AdminOrderTransaction {
  id: number;
  order_id: number;
  invoice_code: string;
  external_id?: string | null;
  payment_method: string | null;
  payment_channel?: string | null;
  payment_url?: string | null;
  payment_reference: string | null;
  amount?: number | string;
  status: "pending" | "success" | "failed";
  paid_at: string | null;
  expired_at: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  order?: {
    id: number;
    user_id: number;
    order_code: string;
    grand_total: number;
    status: string | null;
    user?: {
      id: number;
      fullname: string;
      email: string;
    } | null;
  } | null;
}

export interface AdminOfferingEnrollment {
  id: number;
  user_id: number;
  course_offering_id: number;
  order_id: number | null;
  last_lesson_id: number | null;
  progress: number | null;
  status: string | null;
  user: {
    id: number;
    fullname: string;
    email: string;
  } | null;
  assignment_requirement: {
    required_assignments: number;
    approved_assignments: number;
    is_satisfied: boolean;
  } | null;
  has_certificate: boolean;
  certificate_status: string;
  can_generate_certificate: boolean;
  certificate_block_reason: string | null;
  certificate: {
    id: number;
    certificate_number: string;
    certificate_url: string | null;
    status: string | null;
    template_version: string | null;
    verification_code: string | null;
    issued_at: string | null;
    expired_at: string | null;
    revoked_at: string | null;
    revoked_reason: string | null;
    created_at: string | null;
    updated_at: string | null;
  } | null;
  started_at: string | null;
  ended_at: string | null;
  completed_at: string | null;
  expired_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface AdminOfferingAssignmentSubmission {
  id: number;
  assignment_id: number;
  enrollment_id: number;
  user_id: number;
  attempt_no: number | null;
  submission_text: string | null;
  attachment_url: string | null;
  status: string | null;
  review_notes: string | null;
  reviewed_by: number | null;
  assignment: {
    id: number;
    title: string | null;
    section_id: number | null;
    section_title: string | null;
  } | null;
  user: {
    id: number;
    fullname: string;
    email: string;
  } | null;
  reviewer_name: string | null;
  enrollment: {
    id: number;
    status: string | null;
    progress: number | null;
    course_offering_id: number | null;
  } | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface AdminCertificateSetting {
  id: number;
  organization_name: string;
  certificate_title: string;
  certificate_prefix: string;
  signatory_name: string | null;
  signatory_title: string | null;
  signature_image: string | null;
  background_image: string | null;
  footer_note: string | null;
  expires_after_months: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export type AdminWebsiteSetting = WebsiteSettingGlobal;
export type AdminWebsiteHome = WebsiteHomeContent;
export type AdminWebsiteSocialLink = WebsiteSocialLink;
export type AdminWebsitePage = WebsitePage;
export type AdminWebsiteSection = WebsiteSection;
export type AdminWebsiteFaqCategory = WebsiteFaqCategory;
export type AdminWebsiteFaq = WebsiteFaq;

export interface AdminPaginatedResponse<T> {
  items: T[];
  meta: ApiPaginationMeta;
}

export interface AdminDashboardMetric {
  label: string;
  value: string;
  note: string;
  delta: string;
  deltaTone: "positive" | "negative" | "neutral";
}

export interface AdminDashboardActivity {
  id: number;
  activity: string;
  actor: string;
  event: string | null;
  subject_label: string | null;
  subject_name: string | null;
  occurred_at: string | null;
}

export interface InstructorDashboardCourse {
  id: number;
  title: string;
  slug: string;
  category_name: string | null;
  active_offering_id: number | null;
  active_offerings_count: number;
  total_enrollments_count: number;
  active_students_count: number;
  completed_students_count: number;
  total_reviews_count: number;
  average_rating: number | null;
}

export interface InstructorDashboardOverview {
  total_reviews: number;
  average_rating: number | null;
  forum_posts_this_month: number;
  forum_replies_this_month: number;
  courses: InstructorDashboardCourse[];
}

export interface AdminDashboard {
  context: "admin" | "instructor";
  metrics: AdminDashboardMetric[];
  recent_activities: AdminDashboardActivity[];
  instructor_overview?: InstructorDashboardOverview | null;
}

export interface AdminSalesReportFilters {
  from?: string;
  to?: string;
  academic_period_id?: number;
}

export interface AdminSalesReportStatusBucket {
  status: "pending" | "success" | "failed" | string;
  label: string;
  count: number;
  amount: number;
}

export interface AdminSalesReportTopCourse {
  course_offering_id: number | null;
  course_id: number | null;
  course_title: string;
  course_slug: string;
  instructor_name: string;
  academic_period_id: number | null;
  academic_period_name: string | null;
  academic_period_code: string | null;
  units_sold: number;
  unique_buyers: number;
  revenue: number;
}

export interface AdminSalesReportSummary {
  filters: {
    from: string;
    to: string;
    academic_period_id: number | null;
    timezone: string;
  };
  summary: {
    total_sales: number;
    successful_transactions: number;
    completed_orders: number;
    unique_buyers: number;
  };
  status_breakdown: AdminSalesReportStatusBucket[];
  top_courses: AdminSalesReportTopCourse[];
}

export interface AdminActivityLog {
  id: number;
  activity: string;
  actor: string;
  event: string | null;
  subject_label: string | null;
  subject_name: string | null;
  description: string | null;
  changed_fields: string[];
  occurred_at: string | null;
}

export const ADMIN_PAGE_SIZE = 10;

const ADMIN_OPTION_PAGE_SIZE = 100;

export interface CategoryPayload {
  name: string;
  description?: string | null;
}

export interface CoursePayload {
  title: string;
  description?: string | null;
  category_id: number;
  instructor_id: number;
  skill_ids?: number[];
  thumbnail?: File | null;
  price?: number | null;
  discount_price?: number | null;
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
  open_at?: string | null;
  close_at?: string | null;
}

export interface AssignmentPayload {
  section_id?: number | null;
  title: string;
  description?: string | null;
  instructions?: string | null;
  due_at?: string | null;
  is_required_for_certificate?: boolean;
  allow_resubmission?: boolean;
  max_attempts?: number | null;
  status?: "draft" | "published" | "archived";
}

export interface AssignmentSubmissionReviewPayload {
  status: "approved" | "revision_required";
  review_notes?: string | null;
}

export type CertificateSettingPayload = Omit<AdminCertificateSetting, "id" | "created_at" | "updated_at">;

export interface AdminPaginatedQuery {
  page?: number;
  per_page?: number;
  search?: string;
}

export interface AdminCourseOfferingQuery extends AdminPaginatedQuery {
  is_active?: boolean | string;
  academic_period_id?: number | string;
}

export type AdminOfferingEnrollmentQuery = AdminPaginatedQuery;

export interface AdminOfferingAssignmentSubmissionQuery extends AdminPaginatedQuery {
  assignment_id?: number | string;
  status?: string;
}

export type AdminCourseForumQuery = AdminPaginatedQuery;

export type AdminCourseReviewQuery = AdminPaginatedQuery;

export interface AdminAcademicPeriodQuery extends AdminPaginatedQuery {
  is_active?: boolean | string;
}

export type AdminCourseQuery = AdminPaginatedQuery;

export type AdminSkillQuery = AdminPaginatedQuery;

export type AdminCategoryQuery = AdminPaginatedQuery;

export interface AdminUserQuery extends AdminPaginatedQuery {
  role_group?: "all" | "students" | "instructors" | "staff" | string;
}

export type AdminVoucherQuery = AdminPaginatedQuery;

export type AdminOrderQuery = AdminPaginatedQuery;

export interface AdminTransactionQuery extends AdminPaginatedQuery {
  status?: string;
}

export interface AdminActivityLogQuery extends AdminPaginatedQuery {
  event?: string;
}

export interface AcademicPeriodPayload {
  code: string;
  name: string;
  start_at: string;
  end_at: string;
  enrollment_open_at: string;
  enrollment_close_at: string;
  is_active: boolean;
}

export interface CourseOfferingPayload {
  course_id: number;
  academic_period_id: number;
  capacity: number;
  price: number;
  discount_price?: number | null;
  is_active: boolean;
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

export interface SkillPayload {
  name: string;
  is_active?: boolean;
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

function hasFilePayload(payload: Record<string, unknown>): boolean {
  return Object.values(payload).some((value) => typeof File !== "undefined" && value instanceof File);
}

function buildFormDataPayload(payload: Record<string, unknown>, method?: "PUT" | "PATCH"): FormData {
  const formData = new FormData();

  if (method) {
    formData.set("_method", method);
  }

  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => formData.append(`${key}[]`, String(item)));
      return;
    }

    if (typeof File !== "undefined" && value instanceof File) {
      formData.set(key, value);
      return;
    }

    formData.set(key, value === null ? "" : String(value));
  });

  return formData;
}

type QueryValue = string | number | boolean | undefined | null;

type QueryParams = Record<string, QueryValue>;

function buildQuerySuffix(query: QueryParams): string {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    params.set(key, String(value));
  });

  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

function withListPagination(query: AdminPaginatedQuery = {}): QueryParams {
  return {
    ...query,
    page: query.page ?? 1,
    per_page: query.per_page ?? ADMIN_PAGE_SIZE,
  };
}

function withOptionPagination(query: AdminPaginatedQuery = {}): QueryParams {
  return {
    ...query,
    per_page: query.per_page ?? ADMIN_OPTION_PAGE_SIZE,
  };
}

function getAdminCollection<T>(endpoint: string, query: QueryParams = {}) {
  return apiRequest<T[]>(`${endpoint}${buildQuerySuffix(query)}`, {
    method: "GET",
  });
}

async function listAdminCollection<T>(
  endpoint: string,
  query: QueryParams = {},
): Promise<AdminPaginatedResponse<T>> {
  const response = await apiPaginatedRequest<T[]>(`${endpoint}${buildQuerySuffix(query)}`, {
    method: "GET",
  });

  return {
    items: response.data,
    meta: response.meta,
  };
}

export function createEmptyAdminPaginationMeta(page: number): ApiPaginationMeta {
  return {
    current_page: page,
    last_page: 1,
    per_page: ADMIN_PAGE_SIZE,
    total: 0,
  };
}

export function getAdminRoles() {
  return apiRequest<AdminRole[]>("/api/admin/roles", {
    method: "GET",
  });
}

export function getAdminDashboard() {
  return apiRequest<AdminDashboard>("/api/admin/dashboard", {
    method: "GET",
  });
}

export function getAdminSalesReportSummary(query: AdminSalesReportFilters = {}) {
  return apiRequest<AdminSalesReportSummary>(`/api/admin/reports/sales-summary${buildQuerySuffix(query as QueryParams)}`, {
    method: "GET",
  });
}

export async function listAdminActivityLogs(
  query: AdminActivityLogQuery = {},
): Promise<AdminPaginatedResponse<AdminActivityLog>> {
  return listAdminCollection<AdminActivityLog>("/api/admin/activity-logs", withListPagination(query));
}

export function getAdminUsers(query: AdminUserQuery = {}) {
  return getAdminCollection<AdminUser>("/api/admin/users", withOptionPagination(query));
}

export async function listAdminUsers(query: AdminUserQuery = {}): Promise<AdminPaginatedResponse<AdminUser>> {
  return listAdminCollection<AdminUser>("/api/admin/users", withListPagination(query));
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

export function getAdminCategories(query: AdminCategoryQuery = {}) {
  return getAdminCollection<AdminCategory>("/api/admin/categories", withOptionPagination(query));
}

export async function listAdminCategories(
  query: AdminCategoryQuery = {},
): Promise<AdminPaginatedResponse<AdminCategory>> {
  return listAdminCollection<AdminCategory>("/api/admin/categories", withListPagination(query));
}

export function getAdminSkills(query: AdminSkillQuery = {}) {
  return getAdminCollection<AdminSkill>("/api/admin/skills", withOptionPagination(query));
}

export async function listAdminSkills(query: AdminSkillQuery = {}): Promise<AdminPaginatedResponse<AdminSkill>> {
  return listAdminCollection<AdminSkill>("/api/admin/skills", withListPagination(query));
}

export function createAdminSkill(payload: SkillPayload) {
  return apiRequest<AdminSkill>("/api/admin/skills", {
    method: "POST",
    body: JSON.stringify(normalizePayload(payload)),
  });
}

export function updateAdminSkill(id: number, payload: SkillPayload) {
  return apiRequest<AdminSkill>(`/api/admin/skills/${id}`, {
    method: "PUT",
    body: JSON.stringify(normalizePayload(payload)),
  });
}

export function deleteAdminSkill(id: number) {
  return apiMessageOnly(`/api/admin/skills/${id}`, {
    method: "DELETE",
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

export function getAdminCourses(query: AdminCourseQuery = {}) {
  return getAdminCollection<AdminCourse>("/api/admin/courses", withOptionPagination(query));
}

export async function listAdminCourses(query: AdminCourseQuery = {}): Promise<AdminPaginatedResponse<AdminCourse>> {
  return listAdminCollection<AdminCourse>("/api/admin/courses", withListPagination(query));
}

export function getAdminCourseOfferings(query: AdminCourseOfferingQuery = {}) {
  return getAdminCollection<AdminCourseOffering>("/api/admin/course-offerings", withOptionPagination(query));
}

export function getAdminCourseOfferingById(id: number) {
  return apiRequest<AdminCourseOffering>(`/api/admin/course-offerings/${id}`, {
    method: "GET",
  });
}

export async function listAdminCourseOfferingEnrollments(
  offeringId: number,
  query: AdminOfferingEnrollmentQuery = {},
): Promise<AdminPaginatedResponse<AdminOfferingEnrollment>> {
  return listAdminCollection<AdminOfferingEnrollment>(
    `/api/admin/course-offerings/${offeringId}/enrollments`,
    withListPagination(query),
  );
}

export async function listAdminCourseOfferingAssignmentSubmissions(
  offeringId: number,
  query: AdminOfferingAssignmentSubmissionQuery = {},
): Promise<AdminPaginatedResponse<AdminOfferingAssignmentSubmission>> {
  return listAdminCollection<AdminOfferingAssignmentSubmission>(
    `/api/admin/course-offerings/${offeringId}/assignment-submissions`,
    withListPagination(query),
  );
}

export async function listAdminCourseForumPosts(
  courseId: number,
  query: AdminCourseForumQuery = {},
): Promise<AdminPaginatedResponse<AdminForumPost>> {
  return listAdminCollection<AdminForumPost>(`/api/admin/courses/${courseId}/forum`, withListPagination(query));
}

export async function listAdminCourseReviews(
  courseId: number,
  query: AdminCourseReviewQuery = {},
): Promise<AdminPaginatedResponse<AdminCourseReview>> {
  return listAdminCollection<AdminCourseReview>(`/api/admin/courses/${courseId}/reviews`, withListPagination(query));
}

export function getAdminCourseForumPost(courseId: number, postId: number) {
  return apiRequest<AdminForumPost>(`/api/admin/courses/${courseId}/forum/${postId}`, {
    method: "GET",
  });
}

export function createAdminCourseForumPost(
  courseId: number,
  payload: {
    title: string;
    content: string;
  },
) {
  return apiRequest<AdminForumPost>(`/api/admin/courses/${courseId}/forum`, {
    method: "POST",
    body: JSON.stringify(normalizePayload(payload)),
  });
}

export function updateAdminCourseForumPost(
  courseId: number,
  postId: number,
  payload: {
    title: string;
    content: string;
  },
) {
  return apiRequest<AdminForumPost>(`/api/admin/courses/${courseId}/forum/${postId}`, {
    method: "PUT",
    body: JSON.stringify(normalizePayload(payload)),
  });
}

export function createAdminCourseForumReply(
  courseId: number,
  postId: number,
  payload: {
    content: string;
  },
) {
  return apiRequest<AdminForumReply>(`/api/admin/courses/${courseId}/forum/${postId}/replies`, {
    method: "POST",
    body: JSON.stringify(normalizePayload(payload)),
  });
}

export function updateAdminCourseForumReply(
  replyId: number,
  payload: {
    content: string;
  },
) {
  return apiRequest<AdminForumReply>(`/api/admin/forum-replies/${replyId}`, {
    method: "PUT",
    body: JSON.stringify(normalizePayload(payload)),
  });
}

export function toggleAdminCourseForumPostPin(courseId: number, postId: number) {
  return apiRequest<AdminForumPost>(`/api/admin/courses/${courseId}/forum/${postId}/pin`, {
    method: "PATCH",
  });
}

export function deleteAdminCourseForumPost(courseId: number, postId: number) {
  return apiMessageOnly(`/api/admin/courses/${courseId}/forum/${postId}`, {
    method: "DELETE",
  });
}

export function deleteAdminCourseForumReply(replyId: number) {
  return apiMessageOnly(`/api/admin/forum-replies/${replyId}`, {
    method: "DELETE",
  });
}

export function deleteAdminCourseReview(courseId: number, reviewId: number) {
  return apiMessageOnly(`/api/admin/courses/${courseId}/reviews/${reviewId}`, {
    method: "DELETE",
  });
}

export function reviewAdminAssignmentSubmission(
  submissionId: number,
  payload: AssignmentSubmissionReviewPayload,
) {
  return apiRequest<AdminOfferingAssignmentSubmission>(`/api/admin/assignment-submissions/${submissionId}/review`, {
    method: "PUT",
    body: JSON.stringify(normalizePayload(payload)),
  });
}

export function getAdminCertificateSettings() {
  return apiRequest<AdminCertificateSetting>("/api/admin/certificate-settings", {
    method: "GET",
  });
}

export function getAdminWebsiteSettings() {
  return apiRequest<AdminWebsiteSetting>("/api/admin/website-settings", {
    method: "GET",
  });
}

export function getAdminWebsiteHome() {
  return apiRequest<AdminWebsiteHome>("/api/admin/website/home", {
    method: "GET",
  });
}

export function updateAdminCertificateSettings(payload: CertificateSettingPayload) {
  return apiRequest<AdminCertificateSetting>("/api/admin/certificate-settings", {
    method: "PUT",
    body: JSON.stringify(normalizePayload(payload)),
  });
}

export function updateAdminWebsiteSettings(payload: WebsiteSettingPayload) {
  return apiRequest<AdminWebsiteSetting>("/api/admin/website-settings", {
    method: "PUT",
    body: JSON.stringify(normalizePayload(payload)),
  });
}

export function listAdminWebsiteSocialLinks() {
  return apiRequest<AdminWebsiteSocialLink[]>("/api/admin/website-social-links", {
    method: "GET",
  });
}

export function createAdminWebsiteSocialLink(payload: WebsiteSocialLinkPayload) {
  return apiRequest<AdminWebsiteSocialLink>("/api/admin/website-social-links", {
    method: "POST",
    body: JSON.stringify(normalizePayload(payload)),
  });
}

export function updateAdminWebsiteSocialLink(linkId: number, payload: WebsiteSocialLinkPayload) {
  return apiRequest<AdminWebsiteSocialLink>(`/api/admin/website-social-links/${linkId}`, {
    method: "PUT",
    body: JSON.stringify(normalizePayload(payload)),
  });
}

export function deleteAdminWebsiteSocialLink(linkId: number) {
  return apiMessageOnly(`/api/admin/website-social-links/${linkId}`, {
    method: "DELETE",
  });
}

export function listAdminWebsitePages() {
  return apiRequest<AdminWebsitePage[]>("/api/admin/website-pages", {
    method: "GET",
  });
}

export function createAdminWebsitePage(payload: WebsitePagePayload) {
  return apiRequest<AdminWebsitePage>("/api/admin/website-pages", {
    method: "POST",
    body: JSON.stringify(normalizePayload(payload)),
  });
}

export function updateAdminWebsitePage(pageId: number, payload: WebsitePagePayload) {
  return apiRequest<AdminWebsitePage>(`/api/admin/website-pages/${pageId}`, {
    method: "PUT",
    body: JSON.stringify(normalizePayload(payload)),
  });
}

export function deleteAdminWebsitePage(pageId: number) {
  return apiMessageOnly(`/api/admin/website-pages/${pageId}`, {
    method: "DELETE",
  });
}

export function listAdminWebsiteSections() {
  return apiRequest<AdminWebsiteSection[]>("/api/admin/website-sections", {
    method: "GET",
  });
}

export function createAdminWebsiteSection(payload: WebsiteSectionPayload) {
  return apiRequest<AdminWebsiteSection>("/api/admin/website-sections", {
    method: "POST",
    body: JSON.stringify(normalizePayload(payload)),
  });
}

export function updateAdminWebsiteSection(sectionId: number, payload: WebsiteSectionPayload) {
  return apiRequest<AdminWebsiteSection>(`/api/admin/website-sections/${sectionId}`, {
    method: "PUT",
    body: JSON.stringify(normalizePayload(payload)),
  });
}

export function deleteAdminWebsiteSection(sectionId: number) {
  return apiMessageOnly(`/api/admin/website-sections/${sectionId}`, {
    method: "DELETE",
  });
}

export function listAdminFaqs() {
  return apiRequest<AdminWebsiteFaq[]>("/api/admin/faqs", {
    method: "GET",
  });
}

export function listAdminFaqCategories() {
  return apiRequest<AdminWebsiteFaqCategory[]>("/api/admin/faq-categories", {
    method: "GET",
  });
}

export function createAdminFaqCategory(payload: WebsiteFaqCategoryPayload) {
  return apiRequest<AdminWebsiteFaqCategory>("/api/admin/faq-categories", {
    method: "POST",
    body: JSON.stringify(normalizePayload(payload)),
  });
}

export function updateAdminFaqCategory(categoryId: number, payload: WebsiteFaqCategoryPayload) {
  return apiRequest<AdminWebsiteFaqCategory>(`/api/admin/faq-categories/${categoryId}`, {
    method: "PUT",
    body: JSON.stringify(normalizePayload(payload)),
  });
}

export function deleteAdminFaqCategory(categoryId: number) {
  return apiMessageOnly(`/api/admin/faq-categories/${categoryId}`, {
    method: "DELETE",
  });
}

export function createAdminFaq(payload: WebsiteFaqPayload) {
  return apiRequest<AdminWebsiteFaq>("/api/admin/faqs", {
    method: "POST",
    body: JSON.stringify(normalizePayload(payload)),
  });
}

export function updateAdminFaq(faqId: number, payload: WebsiteFaqPayload) {
  return apiRequest<AdminWebsiteFaq>(`/api/admin/faqs/${faqId}`, {
    method: "PUT",
    body: JSON.stringify(normalizePayload(payload)),
  });
}

export function deleteAdminFaq(faqId: number) {
  return apiMessageOnly(`/api/admin/faqs/${faqId}`, {
    method: "DELETE",
  });
}

export function uploadAdminCertificateAsset(type: "background_image" | "signature_image", file: File) {
  const formData = new FormData();
  formData.set("type", type);
  formData.set("file", file);

  return apiRequest<{ path: string }>("/api/admin/certificate-settings/assets", {
    method: "POST",
    body: formData,
  });
}

export function uploadAdminWebsiteAsset(type: string, file: File) {
  const formData = new FormData();
  formData.set("type", type);
  formData.set("file", file);

  return apiRequest<{ path: string }>("/api/admin/website-settings/assets", {
    method: "POST",
    body: formData,
  });
}

export function generateAdminOfferingEnrollmentCertificate(offeringId: number, enrollmentId: number) {
  return apiRequest<{
    id: number;
    user_id: number;
    course_id: number;
    enrollment_id: number;
    certificate_number: string;
    certificate_url: string | null;
    status: string | null;
    template_version: string | null;
    verification_code: string | null;
    issued_at: string | null;
    expired_at: string | null;
    revoked_at: string | null;
    revoked_reason: string | null;
    created_at: string | null;
    updated_at: string | null;
  }>(`/api/admin/course-offerings/${offeringId}/enrollments/${enrollmentId}/certificate`, {
    method: "POST",
  });
}

export function createAdminCourseOffering(payload: CourseOfferingPayload) {
  return apiRequest<AdminCourseOffering>("/api/admin/course-offerings", {
    method: "POST",
    body: JSON.stringify(normalizePayload(payload)),
  });
}

export function updateAdminCourseOffering(id: number, payload: CourseOfferingPayload) {
  return apiRequest<AdminCourseOffering>(`/api/admin/course-offerings/${id}`, {
    method: "PUT",
    body: JSON.stringify(normalizePayload(payload)),
  });
}

export function deleteAdminCourseOffering(id: number) {
  return apiMessageOnly(`/api/admin/course-offerings/${id}`, {
    method: "DELETE",
  });
}

export function getAdminAcademicPeriods(query: AdminAcademicPeriodQuery = {}) {
  return getAdminCollection<AdminAcademicPeriod>("/api/admin/academic-periods", withOptionPagination(query));
}

export async function listAdminAcademicPeriods(
  query: AdminAcademicPeriodQuery = {},
): Promise<AdminPaginatedResponse<AdminAcademicPeriod>> {
  return listAdminCollection<AdminAcademicPeriod>("/api/admin/academic-periods", withListPagination(query));
}

export function getAdminAcademicPeriodById(id: number) {
  return apiRequest<AdminAcademicPeriod>(`/api/admin/academic-periods/${id}`, {
    method: "GET",
  });
}

export function createAdminAcademicPeriod(payload: AcademicPeriodPayload) {
  return apiRequest<AdminAcademicPeriod>("/api/admin/academic-periods", {
    method: "POST",
    body: JSON.stringify(normalizePayload(payload)),
  });
}

export function updateAdminAcademicPeriod(id: number, payload: AcademicPeriodPayload) {
  return apiRequest<AdminAcademicPeriod>(`/api/admin/academic-periods/${id}`, {
    method: "PUT",
    body: JSON.stringify(normalizePayload(payload)),
  });
}

export function deleteAdminAcademicPeriod(id: number) {
  return apiMessageOnly(`/api/admin/academic-periods/${id}`, {
    method: "DELETE",
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
  const normalizedPayload = normalizePayload(payload);
  const body = hasFilePayload(normalizedPayload)
    ? buildFormDataPayload(normalizedPayload)
    : JSON.stringify(normalizedPayload);

  return apiRequest<AdminCourse>("/api/admin/courses", {
    method: "POST",
    body,
  });
}

export function updateAdminCourse(id: number, payload: CoursePayload) {
  const normalizedPayload = normalizePayload(payload);
  const hasFile = hasFilePayload(normalizedPayload);

  return apiRequest<AdminCourse>(`/api/admin/courses/${id}`, {
    method: hasFile ? "POST" : "PUT",
    body: hasFile
      ? buildFormDataPayload(normalizedPayload, "PUT")
      : JSON.stringify(normalizedPayload),
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

export function getAdminCourseAssignments(courseId: number) {
  return apiRequest<AdminAssignment[] | { data?: AdminAssignment[] }>(`/api/admin/courses/${courseId}/assignments`, {
    method: "GET",
  }).then((payload) => {
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.data)) return payload.data;
    return [];
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

export function createAdminCourseAssignment(courseId: number, payload: AssignmentPayload) {
  return apiRequest<AdminAssignment>(`/api/admin/courses/${courseId}/assignments`, {
    method: "POST",
    body: JSON.stringify(normalizePayload(payload)),
  });
}

export function updateAdminCourseAssignment(
  courseId: number,
  assignmentId: number,
  payload: Partial<AssignmentPayload>,
) {
  return apiRequest<AdminAssignment>(`/api/admin/courses/${courseId}/assignments/${assignmentId}`, {
    method: "PUT",
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

export function getAdminVouchers(query: AdminVoucherQuery = {}) {
  return getAdminCollection<AdminVoucher>("/api/admin/vouchers", withOptionPagination(query));
}

export async function listAdminVouchers(
  query: AdminVoucherQuery = {},
): Promise<AdminPaginatedResponse<AdminVoucher>> {
  return listAdminCollection<AdminVoucher>("/api/admin/vouchers", withListPagination(query));
}

export function getAdminOrders(query: AdminOrderQuery = {}) {
  return getAdminCollection<AdminOrder>("/api/admin/orders", withListPagination(query));
}

export async function listAdminOrders(query: AdminOrderQuery = {}): Promise<AdminPaginatedResponse<AdminOrder>> {
  return listAdminCollection<AdminOrder>("/api/admin/orders", withListPagination(query));
}

export function getAdminOrderById(id: number) {
  return apiRequest<AdminOrder>(`/api/admin/orders/${id}`, {
    method: "GET",
  });
}

export async function listAdminTransactions(
  query: AdminTransactionQuery = {},
): Promise<AdminPaginatedResponse<AdminOrderTransaction>> {
  return listAdminCollection<AdminOrderTransaction>("/api/admin/transactions", withListPagination(query));
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
