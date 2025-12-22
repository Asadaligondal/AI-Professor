"""Dashboard stats router"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, Any

from app.database import get_db
from app.models import Exam, Submission, User

router = APIRouter(prefix="/api/v1/dashboard", tags=["dashboard"])


@router.get("/stats")
async def get_dashboard_stats(
    user_id: str,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get dashboard statistics for a user
    
    Args:
        user_id: The Clerk user ID
        db: Database session
        
    Returns:
        Dictionary containing:
        - total_exams: Total number of exams created by the user
        - total_submissions: Total number of student submissions across all exams
        - average_grade: Average score percentage across all submissions
        - total_students: Total unique students who submitted
    """
    # First, get the database user ID from Clerk ID
    user = db.query(User).filter(User.clerk_id == user_id).first()
    if not user:
        return {
            "total_exams": 0,
            "total_submissions": 0,
            "average_grade": 0.0,
            "total_students": 0
        }
    
    # Count total exams for this user
    total_exams = db.query(func.count(Exam.id)).filter(
        Exam.owner_id == user.id
    ).scalar() or 0
    
    # Get all exam IDs for this user
    user_exam_ids = db.query(Exam.id).filter(
        Exam.owner_id == user.id
    ).all()
    exam_ids = [exam_id[0] for exam_id in user_exam_ids]
    
    if not exam_ids:
        return {
            "total_exams": 0,
            "total_submissions": 0,
            "average_grade": 0.0,
            "total_students": 0
        }
    
    # Count total submissions for user's exams
    total_submissions = db.query(func.count(Submission.id)).filter(
        Submission.exam_id.in_(exam_ids)
    ).scalar() or 0
    
    # Calculate average grade percentage
    # Get all submissions with their scores
    submissions_data = db.query(
        Submission.total_score,
        Exam.total_marks
    ).join(
        Exam, Submission.exam_id == Exam.id
    ).filter(
        Exam.owner_id == user.id,
        Submission.total_score.isnot(None),
        Exam.total_marks > 0
    ).all()
    
    if submissions_data:
        # Calculate percentage for each submission and get average
        percentages = [
            (score / total_marks * 100) 
            for score, total_marks in submissions_data 
            if total_marks > 0
        ]
        average_grade = sum(percentages) / len(percentages) if percentages else 0.0
    else:
        average_grade = 0.0
    
    # Count unique students (by roll_number)
    total_students = db.query(
        func.count(func.distinct(Submission.roll_number))
    ).filter(
        Submission.exam_id.in_(exam_ids)
    ).scalar() or 0
    
    return {
        "total_exams": total_exams,
        "total_submissions": total_submissions,
        "average_grade": round(average_grade, 2),
        "total_students": total_students
    }
