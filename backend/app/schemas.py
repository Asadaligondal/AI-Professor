"""
Pydantic schemas for API request/response validation.
These schemas define the structure of data sent to and from the API.
"""

from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
import enum


# ============================================================================
# Enums
# ============================================================================

class SubscriptionStatus(str, enum.Enum):
    """Subscription status enum"""
    FREE = "free"
    BASIC = "basic"
    PRO = "pro"
    ENTERPRISE = "enterprise"


class GradeStatus(str, enum.Enum):
    """Grade status enum"""
    PENDING = "pending"
    GRADED = "graded"
    REVIEWED = "reviewed"


# ============================================================================
# AI Grading Schemas
# ============================================================================

class RationaleSchema(BaseModel):
    """Schema for grading rationale"""
    points_awarded: List[str] = Field(default_factory=list, description="List of points where student was correct")
    points_deducted: List[str] = Field(default_factory=list, description="List of points where marks were deducted")
    improvement_tip: str = Field(default="", description="Personalized tip for improvement")


class QuestionGradeSchema(BaseModel):
    """Schema for individual question grade"""
    q_num: str = Field(..., description="Question number")
    student_answer: str = Field(..., description="Student's answer text (raw OCR)")
    processed_answer: str = Field(default="", description="AI-processed/interpreted answer")
    expected_answer: str = Field(default="", description="Expected answer from professor's key")
    marks_obtained: float = Field(..., ge=0, description="Marks obtained by student")
    max_marks: float = Field(..., ge=0, description="Maximum marks for question")
    feedback: str = Field(..., description="Overall feedback for this question")
    rationale: RationaleSchema = Field(default_factory=RationaleSchema, description="Detailed reasoning")
    concept_alignment: str = Field(default="N/A", description="Percentage alignment with key concepts")


class StudentGradeSchema(BaseModel):
    """Schema for complete student grade result"""
    student_name: str = Field(..., description="Student's name")
    roll_no: str = Field(..., description="Student's roll number")
    results: List[QuestionGradeSchema] = Field(..., description="Question-wise results")
    total_score: float = Field(..., ge=0, description="Total score obtained")


class GradeExamRequest(BaseModel):
    """Schema for exam grading request"""
    exam_id: str = Field(..., description="ID of the exam being graded")
    marks_per_question: float = Field(default=1.0, ge=0.5, description="Marks per question")
    max_tokens: int = Field(default=4000, ge=1000, le=16000, description="Max API tokens")
    temperature: float = Field(default=0.2, ge=0.0, le=1.0, description="API temperature")


class GradeExamResponse(BaseModel):
    """Schema for exam grading response"""
    success: bool = Field(..., description="Whether grading was successful")
    message: str = Field(..., description="Response message")
    students_graded: int = Field(..., ge=0, description="Number of students graded")
    results: List[StudentGradeSchema] = Field(..., description="Grading results for all students")
    processing_time: Optional[float] = Field(None, description="Time taken in seconds")
    exam_id: Optional[str] = Field(None, description="ID of the created exam")


class GradingErrorResponse(BaseModel):
    """Schema for grading error response"""
    success: bool = False
    error: str = Field(..., description="Error message")
    error_type: str = Field(..., description="Type of error")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional error details")


# ============================================================================
# User Schemas
# ============================================================================

class UserBase(BaseModel):
    """Base user schema with common attributes"""
    email: EmailStr
    full_name: Optional[str] = None


class UserCreate(UserBase):
    """Schema for creating a new user"""
    clerk_id: str = Field(..., description="Clerk authentication ID")
    subscription_status: SubscriptionStatus = SubscriptionStatus.FREE


class UserUpdate(BaseModel):
    """Schema for updating user information"""
    full_name: Optional[str] = None
    subscription_status: Optional[SubscriptionStatus] = None
    credits: Optional[int] = None
    safepay_customer_id: Optional[str] = None


class UserResponse(UserBase):
    """Schema for user response"""
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    clerk_id: str
    subscription_status: SubscriptionStatus
    credits: int
    safepay_customer_id: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None


# ============================================================================
# Exam Schemas
# ============================================================================

class ExamBase(BaseModel):
    """Base exam schema"""
    title: str = Field(..., min_length=1, max_length=500)
    description: Optional[str] = None
    total_marks: int = Field(default=100, ge=0)


class ExamCreate(ExamBase):
    """Schema for creating a new exam"""
    key_pdf_url: str = Field(..., description="URL to the answer key PDF")


class ExamUpdate(BaseModel):
    """Schema for updating exam information"""
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    description: Optional[str] = None
    total_marks: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None
    reviewed: Optional[bool] = None


class ExamResponse(ExamBase):
    """Schema for exam response"""
    model_config = ConfigDict(from_attributes=True, extra='allow')
    
    id: str
    owner_id: Optional[str] = None
    key_pdf_url: Optional[str] = None
    is_active: bool = True
    created_at: Optional[str] = None  # ISO string from Firestore
    updated_at: Optional[str] = None
class ExamWithDetails(ExamResponse):
    """Exam response with related data"""
    total_submissions: int = 0
    total_questions: int = 0


# ============================================================================
# Question Detail Schemas
# ============================================================================

class QuestionDetailBase(BaseModel):
    """Base question detail schema"""
    question_number: int = Field(..., ge=1)
    question_text: Optional[str] = None
    max_marks: int = Field(..., ge=0)


class QuestionDetailCreate(QuestionDetailBase):
    """Schema for creating question details"""
    exam_id: str
    marking_rubric: Optional[Dict[str, Any]] = None
    expected_keywords: Optional[List[str]] = None


class QuestionDetailUpdate(BaseModel):
    """Schema for updating question details"""
    question_text: Optional[str] = None
    max_marks: Optional[int] = Field(None, ge=0)
    marking_rubric: Optional[Dict[str, Any]] = None
    expected_keywords: Optional[List[str]] = None


class QuestionDetailResponse(QuestionDetailBase):
    """Schema for question detail response"""
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    exam_id: str
    marking_rubric: Optional[Dict[str, Any]] = None
    expected_keywords: Optional[List[str]] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


# ============================================================================
# Submission Schemas
# ============================================================================

class SubmissionBase(BaseModel):
    """Base submission schema"""
    student_name: str = Field(..., min_length=1, max_length=255)
    roll_number: str = Field(..., min_length=1, max_length=100)


class SubmissionCreate(SubmissionBase):
    """Schema for creating a submission"""
    exam_id: str
    answer_pdf_url: str = Field(..., description="URL to the student's answer PDF")


class SubmissionUpdate(BaseModel):
    """Schema for updating submission (used for grading)"""
    grade_json: Optional[Dict[str, Any]] = None
    total_score: Optional[int] = None
    percentage: Optional[int] = Field(None, ge=0, le=100)
    grade_status: Optional[GradeStatus] = None
    ai_feedback: Optional[str] = None
    graded_at: Optional[datetime] = None


class SubmissionResponse(SubmissionBase):
    """Schema for submission response"""
    model_config = ConfigDict(from_attributes=True, extra='allow')
    
    id: str
    exam_id: str
    answer_pdf_url: Optional[str] = None
    grade_json: Optional[Dict[str, Any]] = None
    total_score: Optional[float] = None
    percentage: Optional[int] = None
    grade_status: Optional[str] = "pending"
    ai_feedback: Optional[str] = None
    submitted_at: Optional[str] = None  # ISO string from Firestore
    graded_at: Optional[str] = None
    updated_at: Optional[str] = None


class SubmissionWithExam(SubmissionResponse):
    """Submission response with exam details"""
    exam_title: str
    exam_total_marks: int


# ============================================================================
# Grading Schemas
# ============================================================================

class QuestionGrade(BaseModel):
    """Schema for individual question grade"""
    question_number: int
    marks_obtained: float = Field(..., ge=0)
    max_marks: float = Field(..., ge=0)
    feedback: Optional[str] = None


class GradeSubmissionRequest(BaseModel):
    """Schema for grading request"""
    submission_id: str
    question_grades: List[QuestionGrade]
    ai_feedback: Optional[str] = None


class GradeResult(BaseModel):
    """Schema for grading result"""
    submission_id: str
    total_score: float
    percentage: float
    grade_status: GradeStatus
    question_grades: List[QuestionGrade]
    overall_feedback: Optional[str] = None
    graded_at: datetime


# ============================================================================
# Utility Schemas
# ============================================================================

class Message(BaseModel):
    """Generic message response"""
    message: str


class PaginationParams(BaseModel):
    """Pagination parameters"""
    skip: int = Field(0, ge=0)
    limit: int = Field(100, ge=1, le=1000)


class PaginatedResponse(BaseModel):
    """Generic paginated response"""
    items: List[Any]
    total: int
    skip: int
    limit: int
