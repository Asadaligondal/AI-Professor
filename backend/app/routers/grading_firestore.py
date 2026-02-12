"""
Grading API Router
FastAPI endpoints for AI-powered exam grading using Firestore.
"""

import time
import logging
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, status
from fastapi.responses import JSONResponse
from typing import List

from app.firestore_models import FirestoreHelper
from app import schemas
from app.config import get_settings
from services.ai_grader import AIGradingService, GradingError, StudentGradeResult
from services.storage_service import get_storage_service
import json


# Configure logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(
    prefix="/api/v1/grade",
    tags=["Grading"],
    responses={404: {"description": "Not found"}}
)


def get_ai_grading_service() -> AIGradingService:
    """
    Dependency to get AI Grading Service instance.
    
    Returns:
        AIGradingService instance with API key from settings
    
    Raises:
        HTTPException: If OpenAI API key is not configured
    """
    settings = get_settings()
    
    if not settings.openai_api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OpenAI API key not configured. Please set OPENAI_API_KEY environment variable."
        )
    
    return AIGradingService(api_key=settings.openai_api_key)


async def check_credits_firestore(user_id: str) -> dict:
    """
    Check if user has sufficient credits for grading.
    Auto-creates user if not found.
    
    Returns:
        User document dict
        
    Raises:
        HTTPException: If user has insufficient credits
    """
    # Get or create user
    user = FirestoreHelper.get_user(user_id)
    
    if not user:
        logger.info(f"User {user_id} not found, creating with initial credits")
        user = FirestoreHelper.create_user(user_id, email=f"{user_id}@temp.com", initial_credits=5)
        return user
    
    # Check credits
    credits = user.get("credits", 0)
    if credits < 1:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Insufficient credits. Please purchase more credits to continue grading."
        )
    
    return user


@router.post(
    "",
    response_model=schemas.GradeExamResponse,
    status_code=status.HTTP_200_OK,
    summary="Grade student exam papers",
    description="Upload professor's answer key and student papers (PDFs) for AI-powered grading"
)
async def grade_exam(
    professor_key: UploadFile = File(
        ...,
        description="Professor's answer key PDF"
    ),
    student_papers: UploadFile = File(
        ...,
        description="Student exam papers PDF (can contain multiple students)"
    ),
    exam_title: str = Form(
        default="Untitled Exam",
        description="Title of the exam being graded"
    ),
    marks_per_question: float = Form(
        default=1.0,
        ge=0.5,
        description="Marks allocated per question"
    ),
    max_tokens: int = Form(
        default=4000,
        ge=1000,
        le=16000,
        description="Maximum API tokens for response"
    ),
    temperature: float = Form(
        default=0.2,
        ge=0.0,
        le=1.0,
        description="API temperature (lower = more consistent)"
    ),
    user_id: str = Form(..., description="Clerk user ID"),
    rubric: str = Form(None, description="Optional rubric JSON from client"),
    grading_service: AIGradingService = Depends(get_ai_grading_service)
):
    """
    Grade student exam papers using AI with Firestore backend.
    
    This endpoint:
    1. Accepts professor's answer key and student papers as PDFs
    2. Converts PDFs to images for vision processing
    3. Uses OpenAI Vision API to grade answers
    4. Supports batch grading (multiple students in one PDF)
    5. Returns detailed grading results with feedback
    6. Stores results in Firestore
    
    **File Requirements:**
    - PDFs must be clear and readable
    - Handwriting should be legible
    - Student name and roll number should be visible
    
    **Batch Processing:**
    - Can process multiple students from a single PDF
    - AI automatically detects where each student's exam starts
    - Returns individual results for each student
    """
    start_time = time.time()
    
    # Initialize parsed_rubric at function scope
    parsed_rubric = None
    
    try:
        # Validate file types
        if not professor_key.filename.lower().endswith('.pdf'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Professor's answer key must be a PDF file"
            )
        
        if not student_papers.filename.lower().endswith('.pdf'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Student papers must be a PDF file"
            )
        
        # Check credits
        user = await check_credits_firestore(user_id)
        logger.info(f"User {user_id} has {user.get('credits', 0)} credits before grading")
        
        # Read PDF files
        professor_key_bytes = await professor_key.read()
        student_papers_bytes = await student_papers.read()
        
        logger.info(
            f"Files loaded - Professor key: {len(professor_key_bytes)} bytes, "
            f"Student papers: {len(student_papers_bytes)} bytes"
        )
        
        # Parse rubric BEFORE grading so AI can use it
        try:
            if rubric:
                parsed_rubric = json.loads(rubric)
                logger.info(f"Parsed rubric for grading: {len(parsed_rubric.get('questions', []))} questions")
        except Exception as e:
            logger.warning(f"Failed to parse rubric JSON: {e}")
        
        # Grade the exam using AI service
        try:
            grading_results: List[StudentGradeResult] = grading_service.grade_exam(
                professor_key_pdf=professor_key_bytes,
                student_papers_pdf=student_papers_bytes,
                marks_per_question=marks_per_question,
                max_tokens=max_tokens,
                temperature=temperature,
                rubric=parsed_rubric
            )
        except GradingError as e:
            logger.error(f"Grading error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=str(e)
            )
        
        # Create exam in Firestore
        total_questions = len(grading_results[0].results) if grading_results else 0
        max_marks = marks_per_question * total_questions
        
        # Store answer key data
        answer_key_data = {
            "marks_per_question": marks_per_question,
            "total_questions": total_questions,
            "questions": []  # Can be populated from professor key if needed
        }
        
        # First create exam to get exam_id
        exam_id = FirestoreHelper.create_exam(
            teacher_id=user_id,
            title=exam_title,
            answer_key_url="",  # Will update after upload
            answer_key_data=answer_key_data,
            max_marks=max_marks,
            rubric=parsed_rubric,
        )
        
        logger.info(f"✅ Created exam with ID: {exam_id}")
        if parsed_rubric:
            try:
                logger.info(f"Saved rubric to exam {exam_id}: totalMarks={parsed_rubric.get('totalMarks')}")
            except Exception:
                logger.info(f"Saved rubric to exam {exam_id}")
        
        # Upload PDFs to Firebase Storage or store as base64
        answer_key_url = ""
        batch_papers_url = ""
        
        try:
            logger.info("📤 Attempting to upload PDFs to Firebase Storage...")
            storage = get_storage_service()
            
            if storage.bucket:
                logger.info(f"📦 Storage bucket available: {storage.bucket.name}")
                
                # Upload professor's answer key
                logger.info(f"📄 Uploading professor key ({len(professor_key_bytes)} bytes)...")
                answer_key_url = storage.upload_professor_key(
                    exam_id=exam_id,
                    file_data=professor_key_bytes,
                    filename=professor_key.filename
                )
                
                if answer_key_url:
                    logger.info(f"✅ Answer key uploaded: {answer_key_url}")
                
                # Upload batch student papers (combined PDF)
                logger.info(f"📄 Uploading student papers ({len(student_papers_bytes)} bytes)...")
                batch_papers_url = storage.upload_batch_student_papers(
                    exam_id=exam_id,
                    file_data=student_papers_bytes,
                    filename=student_papers.filename
                )
                
                if batch_papers_url:
                    logger.info(f"✅ Student papers uploaded: {batch_papers_url}")
                
                # Update exam with answer key URL
                if answer_key_url:
                    FirestoreHelper.update_exam(exam_id, {"answer_key_url": answer_key_url})
                    logger.info(f"✅ Updated exam {exam_id} with answer_key_url")
            else:
                # FALLBACK: Store PDFs as base64 data URLs in Firestore
                logger.warning("⚠️ Firebase Storage not available - using base64 fallback")
                
                import base64
                
                # Convert PDFs to base64 data URLs
                answer_key_size_kb = len(professor_key_bytes) / 1024
                papers_size_kb = len(student_papers_bytes) / 1024
                
                logger.info(f"📄 Professor key size: {answer_key_size_kb:.1f} KB")
                logger.info(f"📄 Student papers size: {papers_size_kb:.1f} KB")
                
                # Only store if under 500KB to avoid hitting Firestore 1MB limit
                if answer_key_size_kb < 500:
                    answer_key_b64 = base64.b64encode(professor_key_bytes).decode('utf-8')
                    answer_key_url = f"data:application/pdf;base64,{answer_key_b64}"
                    logger.info(f"✅ Answer key stored as base64 data URL")
                else:
                    logger.warning(f"⚠️ Answer key too large ({answer_key_size_kb:.1f}KB) for base64 storage")
                
                if papers_size_kb < 500:
                    papers_b64 = base64.b64encode(student_papers_bytes).decode('utf-8')
                    batch_papers_url = f"data:application/pdf;base64,{papers_b64}"
                    logger.info(f"✅ Student papers stored as base64 data URL")
                else:
                    logger.warning(f"⚠️ Student papers too large ({papers_size_kb:.1f}KB) for base64 storage")
                
                # Update exam with data URL
                if answer_key_url:
                    FirestoreHelper.update_exam(exam_id, {"answer_key_url": answer_key_url})
                    logger.info(f"✅ Updated exam {exam_id} with base64 answer key")
                
                logger.info("ℹ️  Using temporary base64 storage. Enable Firebase Storage + billing for better performance.")
            
        except Exception as storage_error:
            logger.error(f"❌ Storage upload failed: {str(storage_error)}")
            logger.info("ℹ️  Continuing without PDF storage - only extracted text will be saved")
            # Continue without storage URLs (PDFs already processed in memory)
            batch_papers_url = ""
        
        # Convert results to response schema and save submissions
        student_grades = []
        
        for result in grading_results:
            question_grades = [
                schemas.QuestionGradeSchema(
                    q_num=q.q_num,
                    student_answer=q.student_answer,
                    marks_obtained=q.marks_obtained,
                    max_marks=q.max_marks,  # Now includes rubric max
                    feedback=q.feedback,
                    processed_answer=q.processed_answer,
                    expected_answer=q.expected_answer,
                    rationale=schemas.RationaleSchema(
                        points_awarded=q.rationale.points_awarded if q.rationale else [],
                        points_deducted=q.rationale.points_deducted if q.rationale else [],
                        improvement_tip=q.rationale.improvement_tip if q.rationale else ""
                    ) if q.rationale else None,
                    concept_alignment=q.concept_alignment
                )
                for q in result.results
            ]
            
            student_grades.append(
                schemas.StudentGradeSchema(
                    student_name=result.student_name,
                    roll_no=result.roll_no,
                    results=question_grades,
                    total_score=result.total_score
                )
            )
            
            # Create submission in Firestore
            grade_json_data = {
                "results": [
                    {
                        "q_num": q.q_num,
                        "student_answer": q.student_answer,
                        "processed_answer": q.processed_answer,
                        "expected_answer": q.expected_answer,
                        "marks_obtained": q.marks_obtained,
                        "max_marks": q.max_marks,  # Now includes rubric max
                        "feedback": q.feedback,
                        "rationale": {
                            "points_awarded": q.rationale.points_awarded if q.rationale else [],
                            "points_deducted": q.rationale.points_deducted if q.rationale else [],
                            "improvement_tip": q.rationale.improvement_tip if q.rationale else ""
                        } if q.rationale else None,
                        "concept_alignment": q.concept_alignment,
                        "breakdown": {
                            "method": q.marks_obtained * 0.8,  # Example breakdown for frontend detection
                            "final": q.marks_obtained * 0.2
                        } if parsed_rubric else None  # Add breakdown when rubric is used
                    }
                    for q in result.results
                ]
            }
            
            # Note: Individual student papers would need PDF splitting logic
            # For now, we reference the batch upload URL
            student_paper_url = batch_papers_url  # In production, split PDF and upload individual pages
            
            submission_id = FirestoreHelper.create_submission(
                exam_id=exam_id,
                student_name=result.student_name,
                roll_number=result.roll_no,
                submission_file_url=student_paper_url
            )
            
            # Complete grading for this submission
            FirestoreHelper.complete_grading(
                submission_id=submission_id,
                total_score=result.total_score,
                grade_json=grade_json_data,
                ai_feedback=f"Graded {total_questions} questions. Score: {result.total_score}/{max_marks}"
            )
        
        # Deduct 1 credit from user
        FirestoreHelper.decrement_user_credits(user_id, amount=1)
        logger.info(f"Deducted 1 credit from user {user_id}")
        
        processing_time = time.time() - start_time
        
        logger.info(
            f"Grading complete - {len(grading_results)} student(s) graded "
            f"in {processing_time:.2f} seconds"
        )
        
        logger.info(f"🎯 Returning exam_id: {exam_id} (type: {type(exam_id).__name__})")
        
        # Return response
        return schemas.GradeExamResponse(
            success=True,
            message=f"Successfully graded {len(grading_results)} student(s)",
            students_graded=len(grading_results),
            results=student_grades,
            processing_time=round(processing_time, 2),
            exam_id=exam_id
        )
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Unexpected error during grading: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@router.get(
    "/credits/{user_id}",
    summary="Get user credits",
    description="Get current credit balance for a user"
)
async def get_user_credits(user_id: str):
    """Get user's current credit balance"""
    user = await check_credits_firestore(user_id)
    
    return {
        "user_id": user_id,
        "credits": user.get("credits", 0),
        "subscription_status": user.get("subscription_status", "free")
    }


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "grading", "database": "firestore"}
