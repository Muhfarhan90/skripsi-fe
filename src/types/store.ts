export interface StoreCourse {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  category_id: number | null;
  category_name?: string | null;
  instructor_id: number | null;
  instructor_name?: string | null;
  instructor_bio?: string | null;
  instructor_avatar?: string | null;
  course_offering_id?: number | null;
  price: number | null;
  discount_price: number | null;
  reviews_count?: number;
  reviews_avg_rating?: number | null;
  thumbnail: string | null;
  status: string;
  skills?: StoreCourseSkill[];
  requirements: string | null;
  outcomes: string | null;
  sections?: StoreCurriculumSection[];
  created_at: string;
}

export interface StoreCourseSkill {
  id: number;
  name: string;
  slug: string;
}

export interface StoreUserSummary {
  id: number;
  fullname: string;
  avatar: string | null;
}

export interface StoreCourseOfferingSummary {
  id: number;
  course_id: number;
  academic_period_id: number | null;
  title: string;
  capacity: number | null;
  price: number | null;
  discount_price: number | null;
  is_active: boolean;
}

export interface StoreCompletionSnapshot {
  course_id?: number | null;
  course_offering_id?: number | null;
  lesson_ids?: number[];
  quiz_ids?: number[];
  assignment_ids?: number[];
  required_assignment_ids?: number[];
  quiz_grade_items?: Array<{
    quiz_id: number;
    weight: number;
    passing_score?: number | null;
  }>;
  assignment_grade_items?: Array<{
    assignment_id: number;
    is_required_for_certificate?: boolean;
  }>;
  snapshot_at?: string | null;
}

export interface StoreCourseOfferingSnapshot {
  course_id?: number | null;
  course_title?: string | null;
  course_slug?: string | null;
  academic_period_id?: number | null;
  period_code?: string | null;
  period_name?: string | null;
  price?: number | string | null;
  discount_price?: number | string | null;
  final_price?: number | string | null;
}

export interface StoreOrderItem {
  course_id: number | null;
  course_offering_id: number | null;
  price: number;
  course_title?: string | null;
  course_slug?: string | null;
  period_code?: string | null;
  period_name?: string | null;
  course_snapshot?: Record<string, unknown> | null;
  course_offering_snapshot?: StoreCourseOfferingSnapshot | null;
  course?: StoreCourse;
  course_offering?: StoreCourseOfferingSummary | null;
}

export interface StoreTransaction {
  id: number;
  order_id: number;
  invoice_code: string;
  payment_method: string | null;
  payment_channel: string | null;
  payment_url: string | null;
  payment_reference: string | null;
  amount: number;
  status: "pending" | "success" | "failed";
  paid_at: string | null;
  expired_at: string | null;
}

export interface StoreOrder {
  id: number;
  user_id: number;
  voucher_id: number | null;
  order_code: string;
  subtotal: number;
  discount: number;
  tax: number;
  admin_fee: number;
  note: string | null;
  grand_total: number;
  status: "pending" | "completed" | "cancelled";
  created_at: string;
  updated_at: string;
  items: StoreOrderItem[];
  transactions: StoreTransaction[];
}

export interface StoreEnrollment {
  id: number;
  user_id: number;
  course_id: number;
  order_id: number | null;
  last_lesson_id: number | null;
  progress: number;
  status: "active" | "completed" | "cancelled" | string;
  course?: StoreCourse | null;
  order?: StoreOrder | null;
  started_at?: string | null;
  ended_at?: string | null;
  completed_at: string | null;
  expired_at: string | null;
  completion_snapshot?: StoreCompletionSnapshot | null;
  has_certificate?: boolean;
  created_at: string;
  updated_at: string;
}

export interface StoreCertificate {
  id: number;
  user_id: number;
  course_id: number;
  enrollment_id: number;
  certificate_number: string;
  certificate_url: string | null;
  status?: string | null;
  template_version?: string | null;
  verification_code?: string | null;
  snapshot_data?: Record<string, unknown> | null;
  issued_at: string | null;
  expired_at: string | null;
  revoked_at?: string | null;
  revoked_reason?: string | null;
  created_at: string;
  updated_at: string;
  course?: StoreCourse | null;
}

export interface StoreReview {
  id: number;
  user_id: number;
  course_id: number;
  enrollment_id: number | null;
  rating: number;
  review: string | null;
  user?: StoreUserSummary | null;
  created_at: string;
  updated_at: string;
}

export interface StoreForumReply {
  id: number;
  post_id: number;
  user_id: number;
  content: string;
  user?: StoreUserSummary | null;
  created_at: string;
  updated_at: string;
}

export interface StoreForumPost {
  id: number;
  course_id: number;
  user_id: number;
  title: string;
  content: string;
  is_pinned: boolean;
  replies_count?: number | null;
  user?: StoreUserSummary | null;
  replies?: StoreForumReply[];
  created_at: string;
  updated_at: string;
}

export interface StorePaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface StoreEnrollmentProgressSummary {
  enrollment_id: number;
  total_items?: number;
  completed_items?: number;
  remaining_items?: number;
  total_lessons: number;
  completed_lessons: number;
  remaining_lessons: number;
  total_quizzes?: number;
  completed_quizzes?: number;
  remaining_quizzes?: number;
  total_assignments?: number;
  completed_assignments?: number;
  remaining_assignments?: number;
  passed_quiz_ids?: number[];
  approved_assignment_ids?: number[];
  progress: number;
  status: string;
  has_certificate?: boolean;
  can_generate_certificate?: boolean;
  certificate_block_reason?: string | null;
  completed_at: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  completion_snapshot?: StoreCompletionSnapshot | null;
  assignment_requirement?: StoreAssignmentRequirementSummary;
}

export interface StoreLesson {
  id: number;
  section_id: number;
  title: string;
  description: string | null;
  type: string;
  lesson_url: string | null;
  duration: number | null;
  sort_order: number | null;
  is_preview: boolean;
  status?: "published" | "archived" | string | null;
  created_at: string;
  updated_at: string;
}

export interface StoreQuiz {
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
  questions?: StoreQuizQuestion[];
  is_supported?: boolean;
  unsupported_question_types?: string[];
  created_at: string;
  updated_at: string;
}

export interface StoreQuizOption {
  id: number;
  question_id: number;
  option_text: string;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface StoreQuizQuestion {
  id: number;
  quiz_id: number;
  question_text: string;
  image_url: string | null;
  type: string;
  score: number;
  sort_order: number | null;
  is_active: boolean;
  options: StoreQuizOption[];
  created_at: string;
  updated_at: string;
}

export interface StoreQuizAnswer {
  id: number;
  attempt_id: number;
  question_id: number;
  selected_option_id: number | null;
  answer_text: string | null;
  is_correct: boolean | null;
  score: number;
  created_at: string;
  updated_at: string;
}

export interface StoreQuizAttempt {
  id: number;
  enrollment_id: number;
  quiz_id: number;
  total_score: number;
  status: "in_progress" | "submitted" | "graded" | string;
  started_at: string | null;
  submitted_at: string | null;
  answers?: StoreQuizAnswer[];
  created_at: string;
  updated_at: string;
}

export interface StoreQuizDetail extends StoreQuiz {
  questions: StoreQuizQuestion[];
  is_supported: boolean;
  unsupported_question_types: string[];
}

export interface StoreAssignmentSubmission {
  id: number;
  assignment_id: number;
  enrollment_id: number;
  user_id: number;
  attempt_no: number;
  submission_text: string | null;
  attachment_url: string | null;
  status: "submitted" | "revision_required" | "approved" | string;
  review_notes: string | null;
  reviewed_by: number | null;
  reviewer_name: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface StoreAssignment {
  id: number;
  course_id: number;
  section_id: number | null;
  created_by: number | null;
  title: string;
  description: string | null;
  instructions: string | null;
  due_at: string | null;
  is_required_for_certificate: boolean;
  allow_resubmission: boolean;
  max_attempts: number | null;
  status: string;
  section?: StoreSectionSummary | null;
  latest_submission?: StoreAssignmentSubmission | null;
  submissions?: StoreAssignmentSubmission[];
  created_at: string;
  updated_at: string;
}

export interface StoreAssignmentRequirementSummary {
  required_assignments: number;
  approved_assignments: number;
  is_satisfied: boolean;
}

export interface StoreCurriculumSection {
  id: number;
  course_id: number;
  title: string;
  sort_order: number | null;
  lessons: StoreLesson[];
  quizzes?: StoreQuiz[];
  assignments?: StoreAssignment[];
}

export interface StoreCourseCurriculum extends StoreCourse {
  sections: StoreCurriculumSection[];
  updated_at: string;
}

export interface StoreLessonProgress {
  id: number;
  enrollment_id: number;
  lesson_id: number;
  progress_seconds: number;
  last_accessed_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface StoreSectionSummary {
  id: number;
  course_id: number;
  title: string;
  sort_order: number | null;
}

export interface StoreEnrollmentLessonDetail {
  enrollment_id: number;
  section: StoreSectionSummary | null;
  lesson: StoreLesson;
  progress: StoreLessonProgress | null;
}
