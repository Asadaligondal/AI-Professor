"""
Exams API Router
FastAPI endpoints for exam management.
"""

import logging
from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app import models, schemas

# Configure logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(
    prefix="/api/v1/exams",
    tags=["Exams"],
    responses={404: {"description": "Not found"}}
)


@router.get(
    "/{exam_id}",
    response_model=schemas.ExamResponse,
    summary="Get exam details",
    description="Retrieve details for a specific exam"
)
async def get_exam(
    exam_id: int,
    db: Session = Depends(get_db)
):
    """Get exam by ID"""
    exam = db.query(models.Exam).filter(models.Exam.id == exam_id).first()
    
    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Exam with ID {exam_id} not found"
        )
    
    return exam


@router.get(
    "/{exam_id}/submissions",
    response_model=List[schemas.SubmissionResponse],
    summary="Get exam submissions",
    description="Retrieve all submissions for a specific exam"
)
async def get_exam_submissions(
    exam_id: int,
    db: Session = Depends(get_db)
):
    """Get all submissions for an exam"""
    # Verify exam exists
    exam = db.query(models.Exam).filter(models.Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Exam with ID {exam_id} not found"
        )
    
    # Get submissions
    submissions = db.query(models.Submission).filter(
        models.Submission.exam_id == exam_id
    ).order_by(models.Submission.student_name).all()
    
    return submissions


@router.patch(
    "/submissions/{submission_id}",
    response_model=schemas.SubmissionResponse,
    summary="Update submission",
    description="Update marks and feedback for a submission"
)
async def update_submission(
    submission_id: int,
    update_data: schemas.SubmissionUpdate,
    db: Session = Depends(get_db)
):
    """Update submission marks and feedback"""
    submission = db.query(models.Submission).filter(
        models.Submission.id == submission_id
    ).first()
    
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Submission with ID {submission_id} not found"
        )
    
    # Update grade_json if provided (contains question-level marks)
    if update_data.grade_json is not None:
        submission.grade_json = update_data.grade_json
        
        # Recalculate total_score from grade_json
        if isinstance(update_data.grade_json, dict) and "questions" in update_data.grade_json:
            total = 0.0
            for question in update_data.grade_json["questions"]:
                if "marks_obtained" in question:
                    try:
                        total += float(question["marks_obtained"])
                    except (ValueError, TypeError):
                        pass
            submission.total_score = total
            logger.info(f"Recalculated total_score: {total} for submission {submission_id}")
    
    # Allow direct total_score update if grade_json not provided
    elif update_data.total_score is not None:
        submission.total_score = update_data.total_score
    
    # Update feedback
    if update_data.ai_feedback is not None:
        submission.ai_feedback = update_data.ai_feedback
    
    db.commit()
    db.refresh(submission)
    
    logger.info(f"Updated submission {submission_id} for student {submission.student_name}, total_score: {submission.total_score}")
    
    return submission


@router.get(
    "",
    response_model=List[schemas.ExamWithDetails],
    summary="Get all exams",
    description="Retrieve all exams for the authenticated user"
)
async def get_exams(
    user_id: str,
    db: Session = Depends(get_db)
):
    """Get all exams for a user"""
    # Get user
    user = db.query(models.User).filter(models.User.clerk_id == user_id).first()
    if not user:
        return []
    
    # Get exams with submission counts
    exams = db.query(models.Exam).filter(
        models.Exam.owner_id == user.id
    ).order_by(models.Exam.created_at.desc()).all()
    
    # Add submission counts
    exam_list = []
    for exam in exams:
        submission_count = db.query(models.Submission).filter(
            models.Submission.exam_id == exam.id
        ).count()
        
        exam_dict = {
            **exam.__dict__,
            "total_submissions": submission_count,
            "total_questions": 0  # Can be calculated from question_details if needed
        }
        exam_list.append(exam_dict)
    
    return exam_list
