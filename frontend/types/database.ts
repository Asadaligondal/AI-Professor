/**
 * TypeScript type definitions matching the backend SQLAlchemy models
 * These interfaces ensure type safety across the frontend-backend boundary
 */

// ============================================================================
// Enums
// ============================================================================

export enum SubscriptionTier {
  FREE = "free",
  BASIC = "basic",
  PRO = "pro",
  ENTERPRISE = "enterprise",
}

export enum GradeLevel {
  A_PLUS = "A+",
  A = "A",
  A_MINUS = "A-",
  B_PLUS = "B+",
  B = "B",
  B_MINUS = "B-",
  C_PLUS = "C+",
  C = "C",
  C_MINUS = "C-",
  D = "D",
  F = "F",
}

export enum ProcessingStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
}

export enum GradingStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
}

// ============================================================================
// User Model
// ============================================================================

export interface User {
  id: number;
  clerk_user_id: string;
  email: string;
  full_name?: string | null;
  
  // Subscription details
  subscription_tier: SubscriptionTier;
  subscription_status: string;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  subscription_start_date?: string | null;
  subscription_end_date?: string | null;
  
  // Usage tracking
  exams_created: number;
  submissions_graded: number;
  
  // Timestamps
  created_at: string;
  updated_at?: string | null;
}

export interface CreateUserRequest {
  clerk_user_id: string;
  email: string;
  full_name?: string;
  subscription_tier?: SubscriptionTier;
}

export interface UpdateUserRequest {
  full_name?: string;
  subscription_tier?: SubscriptionTier;
  subscription_status?: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
}

// ============================================================================
// Exam Model
// ============================================================================

export interface Exam {
  id: number;
  owner_id: number;
  
  // Exam details
  title: string;
  description?: string | null;
  subject?: string | null;
  
  // Answer key information
  answer_key_pdf_url: string;
  answer_key_storage_path?: string | null;
  
  // Grading configuration
  total_marks?: number | null;
  passing_marks?: number | null;
  grading_criteria?: Record<string, any> | null;
  
  // AI Processing status
  is_processed: boolean;
  processing_status: ProcessingStatus;
  
  // Metadata
  total_questions: number;
  total_submissions: number;
  
  // Timestamps
  created_at: string;
  updated_at?: string | null;
  
  // Relations (populated when needed)
  owner?: User;
  questions?: QuestionDetail[];
  submissions?: Submission[];
}

export interface CreateExamRequest {
  title: string;
  description?: string;
  subject?: string;
  answer_key_pdf_url: string;
  total_marks?: number;
  passing_marks?: number;
  grading_criteria?: Record<string, any>;
}

export interface UpdateExamRequest {
  title?: string;
  description?: string;
  subject?: string;
  total_marks?: number;
  passing_marks?: number;
  grading_criteria?: Record<string, any>;
}

// ============================================================================
// Question Detail Model
// ============================================================================

export interface QuestionDetail {
  id: number;
  exam_id: number;
  
  // Question information
  question_number: number;
  question_text?: string | null;
  question_type?: string | null;
  
  // Answer information
  correct_answer: string;
  answer_explanation?: string | null;
  marks_allocated: number;
  
  // Additional metadata
  topic?: string | null;
  difficulty_level?: string | null;
  keywords?: string[] | null;
  
  // Timestamps
  created_at: string;
  updated_at?: string | null;
  
  // Relations
  exam?: Exam;
}

export interface CreateQuestionDetailRequest {
  exam_id: number;
  question_number: number;
  question_text?: string;
  question_type?: string;
  correct_answer: string;
  answer_explanation?: string;
  marks_allocated: number;
  topic?: string;
  difficulty_level?: string;
  keywords?: string[];
}

// ============================================================================
// Submission Model
// ============================================================================

export interface Submission {
  id: number;
  exam_id: number;
  
  // Student information
  student_name: string;
  roll_number: string;
  
  // Submission file
  answer_pdf_url: string;
  answer_pdf_storage_key?: string | null;
  
  // Grading results
  grade_json?: Record<string, any> | null;
  total_score?: number | null;
  percentage?: number | null;
  
  // AI Processing
  grade_status: string;
  ai_feedback?: string | null;
  
  // Timestamps
  submitted_at: string;
  graded_at?: string | null;
  updated_at?: string | null;
  
  // Relations
  exam?: Exam;
}

export interface CreateSubmissionRequest {
  exam_id: number;
  student_name: string;
  roll_number: string;
  email?: string;
  submission_pdf_url: string;
}

export interface UpdateSubmissionRequest {
  grade_json?: Record<string, any>;
  total_score?: number;
  percentage?: number;
  grade_status?: string;
  ai_feedback?: string;
  graded_at?: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ============================================================================
// Grading Result Types
// ============================================================================

export interface QuestionGrade {
  question_number: number;
  marks_obtained: number;
  max_marks: number;
  feedback?: string;
  is_correct?: boolean;
}

export interface GradeResult {
  submission_id: number;
  total_marks_obtained: number;
  total_marks: number;
  percentage: number;
  grade: GradeLevel;
  question_grades: QuestionGrade[];
  overall_feedback?: string;
  graded_at: string;
}
