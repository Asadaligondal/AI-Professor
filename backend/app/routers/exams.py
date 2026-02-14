"""
Exams API Router
FastAPI endpoints for exam management using Firestore.
"""

import logging
from fastapi import APIRouter, HTTPException, status
from typing import List

from app.firestore_models import FirestoreHelper
from app import schemas

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
async def get_exam(exam_id: str):
    """Get exam by ID"""
    exam = FirestoreHelper.get_exam(exam_id)
    
    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Exam with ID {exam_id} not found"
        )
    
    # Map Firestore field names to schema field names
    if "teacher_id" in exam:
        exam["owner_id"] = exam.get("teacher_id")
    if "answer_key_url" in exam:
        exam["key_pdf_url"] = exam.get("answer_key_url")
    if "max_marks" in exam:
        exam["total_marks"] = exam.get("max_marks")
    if "is_active" not in exam:
        exam["is_active"] = True
    if "description" not in exam:
        exam["description"] = None
    
    return exam


@router.get(
    "/{exam_id}/submissions",
    response_model=List[schemas.SubmissionResponse],
    summary="Get exam submissions",
    description="Retrieve all submissions for a specific exam"
)
async def get_exam_submissions(exam_id: str):
    """Get all submissions for an exam"""
    # Verify exam exists
    exam = FirestoreHelper.get_exam(exam_id)
    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Exam with ID {exam_id} not found"
        )
    
    # Get submissions
    submissions = FirestoreHelper.get_exam_submissions(exam_id)
    
    # Map Firestore field names to schema field names
    for submission in submissions:
        if "submission_file_url" in submission:
            submission["answer_pdf_url"] = submission.get("submission_file_url", "")
        if "status" in submission:
            submission["grade_status"] = submission.get("status", "pending")
        if "created_at" in submission and "submitted_at" not in submission:
            submission["submitted_at"] = submission.get("created_at")
        if "student_name" not in submission:
            submission["student_name"] = "Unknown"
        if "roll_number" not in submission:
            submission["roll_number"] = "N/A"
    
    # Sort by student name
    submissions.sort(key=lambda x: x.get("student_name", ""))
    
    return submissions


@router.patch(
    "/submissions/{submission_id}",
    response_model=schemas.SubmissionResponse,
    summary="Update submission",
    description="Update marks and feedback for a submission"
)
async def update_submission(
    submission_id: str,
    update_data: schemas.SubmissionUpdate
):
    """Update submission marks and feedback"""
    submission = FirestoreHelper.get_submission(submission_id)
    
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Submission with ID {submission_id} not found"
        )
    
    updates = {}
    
    # Update grade_json if provided (contains question-level marks)
    if update_data.grade_json is not None:
        updates["grade_json"] = update_data.grade_json
        
        # Recalculate total_score from grade_json
        if isinstance(update_data.grade_json, dict) and "results" in update_data.grade_json:
            total = 0.0
            for question in update_data.grade_json["results"]:
                if "marks_obtained" in question:
                    try:
                        total += float(question["marks_obtained"])
                    except (ValueError, TypeError):
                        pass
            updates["total_score"] = total
            logger.info(f"Recalculated total_score: {total} for submission {submission_id}")
    
    # Allow direct total_score update if grade_json not provided
    elif update_data.total_score is not None:
        updates["total_score"] = update_data.total_score
    
    # Update feedback
    if update_data.ai_feedback is not None:
        updates["ai_feedback"] = update_data.ai_feedback
    # Update grade status (map to Firestore 'status' field)
    if update_data.grade_status is not None:
        # grade_status may be a pydantic enum; store its value string in Firestore
        try:
            updates["status"] = update_data.grade_status.value
        except Exception:
            updates["status"] = str(update_data.grade_status)
    
    # Apply updates
    if updates:
        FirestoreHelper.update_submission(submission_id, updates)
    
    # Get updated submission
    updated_submission = FirestoreHelper.get_submission(submission_id)
    logger.info(f"Updated submission {submission_id} for student {updated_submission['student_name']}, total_score: {updated_submission.get('total_score', 0)}")
    
    return updated_submission


@router.get(
    "",
    response_model=List[schemas.ExamWithDetails],
    summary="Get all exams",
    description="Retrieve all exams for the authenticated user"
)
async def get_exams(user_id: str):
    """Get all exams for a user"""
    logger.info(f"Getting exams for user_id: {user_id}")
    
    # Get or create user
    user = FirestoreHelper.get_user(user_id)
    if not user:
        logger.info(f"User not found, creating new user: {user_id}")
        # Auto-create user with default credits
        FirestoreHelper.create_user(user_id, email=f"{user_id}@temp.com", initial_credits=5)
    
    # Get exams for this user
    exams = FirestoreHelper.get_user_exams(user_id)
    logger.info(f"Found {len(exams)} exams")
    
    # Add submission counts
    exam_list = []
    for exam in exams:
        submissions = FirestoreHelper.get_exam_submissions(exam["id"])
        
        exam_dict = {
            **exam,
            "total_submissions": len(submissions),
            "total_questions": len(exam.get("answer_key_data", {}).get("questions", []))
        }
        exam_list.append(exam_dict)
    
    logger.info(f"Returning {len(exam_list)} exams")
    return exam_list


@router.patch(
    "/{exam_id}",
    response_model=schemas.ExamResponse,
    summary="Update exam",
    description="Update exam fields such as title, description, total marks, active flag, or reviewed flag"
)
async def patch_exam(
    exam_id: str,
    update_data: schemas.ExamUpdate
):
    """Patch/update exam metadata"""
    exam = FirestoreHelper.get_exam(exam_id)
    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Exam with ID {exam_id} not found"
        )

    updates = {}
    # Map provided fields to Firestore document fields
    if update_data.title is not None:
        updates["title"] = update_data.title
    if update_data.description is not None:
        updates["description"] = update_data.description
    if update_data.total_marks is not None:
        updates["max_marks"] = update_data.total_marks
    if update_data.is_active is not None:
        updates["is_active"] = update_data.is_active
    if getattr(update_data, "reviewed", None) is not None:
        updates["reviewed"] = update_data.reviewed

    if updates:
        FirestoreHelper.update_exam(exam_id, updates)

    updated = FirestoreHelper.get_exam(exam_id)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve updated exam"
        )
    # Normalize some fields for response
    if "teacher_id" in updated:
        updated["owner_id"] = updated.get("teacher_id")
    if "answer_key_url" in updated:
        updated["key_pdf_url"] = updated.get("answer_key_url")
    if "max_marks" in updated:
        updated["total_marks"] = updated.get("max_marks")

    return updated
