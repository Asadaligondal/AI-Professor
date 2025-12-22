"""
Pydantic schemas for API request/response validation.
These schemas define the structure of data sent to and from the API.
"""

from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.models import SubscriptionStatus, GradeStatus


# ============================================================================
# AI Grading Schemas
# ============================================================================

class QuestionGradeSchema(BaseModel):
    """Schema for individual question grade"""
    q_num: str = Field(..., description="Question number")
    student_answer: str = Field(..., description="Student's answer text")
    marks_obtained: float = Field(..., ge=0, description="Marks obtained by student")
    max_marks: float = Field(..., ge=0, description="Maximum marks for question")
    feedback: str = Field(..., description="Feedback for this question")


class StudentGradeSchema(BaseModel):
    """Schema for complete student grade result"""
    student_name: str = Field(..., description="Student's name")
    roll_no: str = Field(..., description="Student's roll number")
    results: List[QuestionGradeSchema] = Field(..., description="Question-wise results")
    total_score: float = Field(..., ge=0, description="Total score obtained")


class GradeExamRequest(BaseModel):
    """Schema for exam grading request"""
    exam_id: int = Field(..., description="ID of the exam being graded")
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
    exam_id: Optional[int] = Field(None, description="ID of the created exam")


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
    stripe_customer_id: Optional[str] = None
    stripe_subscription_id: Optional[str] = None


class UserResponse(UserBase):
    """Schema for user response"""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    clerk_id: str
    subscription_status: SubscriptionStatus
    stripe_customer_id: Optional[str] = None
    stripe_subscription_id: Optional[str] = None
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


class ExamResponse(ExamBase):
    """Schema for exam response"""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    owner_id: int
    key_pdf_url: str
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None


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
    exam_id: int
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
    
    id: int
    exam_id: int
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
    exam_id: int
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
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    exam_id: int
    answer_pdf_url: str
    grade_json: Optional[Dict[str, Any]] = None
    total_score: Optional[int] = None
    percentage: Optional[int] = None
    grade_status: GradeStatus
    ai_feedback: Optional[str] = None
    submitted_at: datetime
    graded_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


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
    submission_id: int
    question_grades: List[QuestionGrade]
    ai_feedback: Optional[str] = None


class GradeResult(BaseModel):
    """Schema for grading result"""
    submission_id: int
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
