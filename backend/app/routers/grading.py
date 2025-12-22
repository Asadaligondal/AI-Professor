"""
Grading API Router
FastAPI endpoints for AI-powered exam grading.
"""

import time
import logging
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app import models, schemas
from app.config import get_settings
from services.ai_grader import AIGradingService, GradingError, StudentGradeResult


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
    user_id: str = Form(
        ...,
        description="Clerk user ID of the professor"
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
    db: Session = Depends(get_db),
    grading_service: AIGradingService = Depends(get_ai_grading_service)
):
    """
    Grade student exam papers using AI.
    
    This endpoint:
    1. Accepts professor's answer key and student papers as PDFs
    2. Converts PDFs to images for vision processing
    3. Uses OpenAI Vision API to grade answers
    4. Supports batch grading (multiple students in one PDF)
    5. Returns detailed grading results with feedback
    
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
        
        # Get or create user
        user = db.query(models.User).filter(models.User.clerk_id == user_id).first()
        if not user:
            # Create user if doesn't exist
            user = models.User(
                clerk_id=user_id,
                email=f"{user_id}@temp.com",  # Placeholder, should be updated from Clerk
                subscription_status=models.SubscriptionStatus.FREE
            )
            db.add(user)
            db.flush()  # Get user.id without committing
        
        # Create exam
        exam = models.Exam(
            owner_id=user.id,
            title=exam_title,
            key_pdf_url="",  # Empty for now, could store URL if needed
            total_marks=0  # Will be updated after grading
        )
        db.add(exam)
        db.flush()  # Get exam.id without committing
        
        logger.info(f"Created exam {exam.id}: {exam.title} for user {user_id}")
        
        # Read PDF files
        professor_key_bytes = await professor_key.read()
        student_papers_bytes = await student_papers.read()
        
        logger.info(
            f"Files loaded - Professor key: {len(professor_key_bytes)} bytes, "
            f"Student papers: {len(student_papers_bytes)} bytes"
        )
        
        # Grade the exam using AI service
        try:
            grading_results: List[StudentGradeResult] = grading_service.grade_exam(
                professor_key_pdf=professor_key_bytes,
                student_papers_pdf=student_papers_bytes,
                marks_per_question=marks_per_question,
                max_tokens=max_tokens,
                temperature=temperature
            )
        except GradingError as e:
            logger.error(f"Grading error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=str(e)
            )
        
        # Convert results to response schema
        student_grades = []
        total_questions = 0
        
        for result in grading_results:
            question_grades = [
                schemas.QuestionGradeSchema(
                    q_num=q.q_num,
                    student_answer=q.student_answer,
                    marks_obtained=q.marks_obtained,
                    max_marks=q.max_marks,
                    feedback=q.feedback
                )
                for q in result.results
            ]
            
            # Track total questions from first student
            if total_questions == 0:
                total_questions = len(result.results)
            
            student_grades.append(
                schemas.StudentGradeSchema(
                    student_name=result.student_name,
                    roll_no=result.roll_no,
                    results=question_grades,
                    total_score=result.total_score
                )
            )
            
            # Create submission record in database
            # Convert results to dict for grade_json
            grade_json_data = {
                "results": [
                    {
                        "q_num": q.q_num,
                        "student_answer": q.student_answer,
                        "marks_obtained": q.marks_obtained,
                        "max_marks": q.max_marks,
                        "feedback": q.feedback
                    }
                    for q in result.results
                ]
            }
            
            submission = models.Submission(
                exam_id=exam.id,
                student_name=result.student_name,
                roll_number=result.roll_no,
                answer_pdf_url="",  # Empty for now, could store student PDF URL if needed
                total_score=result.total_score,
                grade_json=grade_json_data,
                grade_status=models.GradeStatus.GRADED
            )
            db.add(submission)
        
        # Update exam with total marks
        if total_questions > 0:
            exam.total_marks = marks_per_question * total_questions
        
        # Commit all changes
        db.commit()
        db.refresh(exam)
        
        processing_time = time.time() - start_time
        
        logger.info(
            f"Grading complete - {len(grading_results)} student(s) graded "
            f"in {processing_time:.2f} seconds"
        )
        
        # Return response
        return schemas.GradeExamResponse(
            success=True,
            message=f"Successfully graded {len(grading_results)} student(s)",
            students_graded=len(grading_results),
            results=student_grades,
            processing_time=round(processing_time, 2),
            exam_id=exam.id
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


@router.post(
    "/save",
    status_code=status.HTTP_201_CREATED,
    summary="Save grading results to database",
    description="Save AI grading results as submissions in the database"
)
async def save_grading_results(
    exam_id: int = Form(..., description="Exam ID"),
    grading_results: str = Form(..., description="JSON string of grading results"),
    db: Session = Depends(get_db)
):
    """
    Save grading results to database as submissions.
    
    This endpoint:
    1. Accepts grading results (typically from /api/v1/grade)
    2. Creates Submission records in the database
    3. Links submissions to the specified exam
    4. Stores detailed grading data as JSON
    
    **Note:** This is typically called after /api/v1/grade to persist results.
    """
    import json
    
    try:
        # Parse grading results JSON
        try:
            results_data = json.loads(grading_results)
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid JSON in grading_results"
            )
        
        # Verify exam exists
        exam = db.query(models.Exam).filter(models.Exam.id == exam_id).first()
        if not exam:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Exam with ID {exam_id} not found"
            )
        
        saved_submissions = []
        
        # Create submission records for each student
        for student_data in results_data:
            # Extract student information
            student_name = student_data.get("student_name", "Unknown")
            roll_no = student_data.get("roll_no", "N/A")
            total_score = student_data.get("total_score", 0)
            results = student_data.get("results", [])
            
            # Calculate percentage
            total_possible = sum(r.get("max_marks", 0) for r in results)
            percentage = (total_score / total_possible * 100) if total_possible > 0 else 0
            
            # Create submission record
            submission = models.Submission(
                exam_id=exam_id,
                student_name=student_name,
                roll_number=roll_no,
                answer_pdf_url="",  # Will be updated when PDF storage is implemented
                grade_json=student_data,
                total_score=int(total_score),
                percentage=int(percentage),
                grade_status=models.GradeStatus.GRADED,
                ai_feedback=f"AI-graded: {len(results)} questions processed"
            )
            
            db.add(submission)
            saved_submissions.append({
                "student_name": student_name,
                "roll_no": roll_no,
                "total_score": total_score
            })
        
        # Commit all submissions
        db.commit()
        
        logger.info(f"Saved {len(saved_submissions)} submissions for exam {exam_id}")
        
        return {
            "success": True,
            "message": f"Saved {len(saved_submissions)} submission(s) to database",
            "submissions": saved_submissions
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error saving grading results: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save results: {str(e)}"
        )


@router.get(
    "/health",
    summary="Check grading service health",
    description="Verify that the grading service is configured and operational"
)
async def grading_health_check(
    grading_service: AIGradingService = Depends(get_ai_grading_service)
):
    """
    Health check endpoint for grading service.
    
    Returns:
        Service status and configuration info
    """
    return {
        "status": "healthy",
        "service": "AI Grading Service",
        "model": grading_service.model,
        "configured": True
    }
