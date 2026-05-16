export interface StoreCourse {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  category_id: number | null;
  category_name?: string | null;
  instructor_id: number | null;
  instructor_name?: string | null;
  course_offering_id?: number | null;
  price: number | null;
  discount_price: number | null;
  thumbnail: string | null;
  status: string;
  requirements: string | null;
  outcomes: string | null;
  created_at: string;
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

export interface StoreOrderItem {
  course_id: number | null;
  course_offering_id: number | null;
  price: number;
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
  payment_proof: string | null;
  status: string;
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
  status: "cart" | "pending" | "completed" | "cancelled";
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
  completed_at: string | null;
  expired_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface StoreEnrollmentProgressSummary {
  enrollment_id: number;
  total_lessons: number;
  completed_lessons: number;
  remaining_lessons: number;
  progress: number;
  status: string;
  completed_at: string | null;
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

export interface StoreCurriculumSection {
  id: number;
  course_id: number;
  title: string;
  sort_order: number | null;
  lessons: StoreLesson[];
  quizzes?: StoreQuiz[];
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
