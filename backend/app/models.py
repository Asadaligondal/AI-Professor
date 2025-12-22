from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, JSON, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


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


class User(Base):
    """User model with Clerk authentication"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    clerk_id = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=True)
    subscription_status = Column(
        SQLEnum(SubscriptionStatus), 
        default=SubscriptionStatus.FREE,
        nullable=False
    )
    stripe_customer_id = Column(String, unique=True, nullable=True)
    stripe_subscription_id = Column(String, unique=True, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    exams = relationship("Exam", back_populates="owner", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, subscription={self.subscription_status})>"


class Exam(Base):
    """Exam model to store exam information"""
    __tablename__ = "exams"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)
    key_pdf_url = Column(String, nullable=False)  # S3 or cloud storage URL
    key_pdf_storage_key = Column(String, nullable=True)  # Storage key for deletion
    total_marks = Column(Integer, default=100)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    owner = relationship("User", back_populates="exams")
    submissions = relationship("Submission", back_populates="exam", cascade="all, delete-orphan")
    questions = relationship("QuestionDetail", back_populates="exam", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Exam(id={self.id}, title={self.title}, owner_id={self.owner_id})>"


class Submission(Base):
    """Submission model to store student exam submissions"""
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False)
    student_name = Column(String, nullable=False, index=True)
    roll_number = Column(String, nullable=False, index=True)
    answer_pdf_url = Column(String, nullable=False)  # S3 or cloud storage URL
    answer_pdf_storage_key = Column(String, nullable=True)
    
    # Grading information
    grade_json = Column(JSON, nullable=True)  # Structured grading data from AI
    total_score = Column(Integer, nullable=True)
    percentage = Column(Integer, nullable=True)
    grade_status = Column(
        SQLEnum(GradeStatus),
        default=GradeStatus.PENDING,
        nullable=False
    )
    ai_feedback = Column(Text, nullable=True)
    
    # Timestamps
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    graded_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    exam = relationship("Exam", back_populates="submissions")

    def __repr__(self):
        return f"<Submission(id={self.id}, student={self.student_name}, exam_id={self.exam_id})>"


class QuestionDetail(Base):
    """Question details for each exam"""
    __tablename__ = "question_details"

    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False)
    question_number = Column(Integer, nullable=False)
    question_text = Column(Text, nullable=True)
    max_marks = Column(Integer, nullable=False)
    marking_rubric = Column(JSON, nullable=True)  # Detailed marking criteria
    expected_keywords = Column(JSON, nullable=True)  # Keywords for AI grading
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    exam = relationship("Exam", back_populates="questions")

    def __repr__(self):
        return f"<QuestionDetail(id={self.id}, exam_id={self.exam_id}, q_num={self.question_number})>"
