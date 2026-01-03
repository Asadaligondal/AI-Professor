"""Dashboard stats router using Firestore"""
from fastapi import APIRouter, HTTPException
from typing import Dict, Any

from app.firestore_models import FirestoreHelper

router = APIRouter(prefix="/api/v1/dashboard", tags=["dashboard"])


@router.get("/stats")
async def get_dashboard_stats(user_id: str) -> Dict[str, Any]:
    """
    Get dashboard statistics for a user
    
    Args:
        user_id: The Clerk user ID
        
    Returns:
        Dictionary containing:
        - total_exams: Total number of exams created by the user
        - total_submissions: Total number of student submissions across all exams
        - average_grade: Average score percentage across all submissions
        - total_students: Total unique students who submitted
        - credits: User's current credit balance
        - subscription_status: User's subscription tier
    """
    # Get or create user
    user = FirestoreHelper.get_user(user_id)
    if not user:
        # Auto-create user
        user = FirestoreHelper.create_user(user_id, email=f"{user_id}@temp.com", initial_credits=5)
    
    # Get all exams for this user
    exams = FirestoreHelper.get_user_exams(user_id)
    total_exams = len(exams)
    
    # Collect all submissions across all exams
    all_submissions = []
    unique_students = set()
    
    for exam in exams:
        submissions = FirestoreHelper.get_exam_submissions(exam["id"])
        all_submissions.extend(submissions)
        
        # Track unique students by roll number
        for sub in submissions:
            roll_no = sub.get("roll_number", "")
            if roll_no:
                unique_students.add(roll_no.lower().strip())
    
    total_submissions = len(all_submissions)
    
    # Calculate average grade
    if total_submissions > 0:
        total_score_sum = 0
        total_max_sum = 0
        
        for sub in all_submissions:
            grade_json = sub.get("grade_json", {})
            if grade_json and "results" in grade_json:
                for result in grade_json["results"]:
                    total_score_sum += result.get("marks_obtained", 0)
                    total_max_sum += result.get("max_marks", 0)
        
        average_grade = (total_score_sum / total_max_sum * 100) if total_max_sum > 0 else 0.0
    else:
        average_grade = 0.0
    
    return {
        "total_exams": total_exams,
        "total_submissions": total_submissions,
        "average_grade": round(average_grade, 2),
        "total_students": len(unique_students),
        "credits": user.get("credits", 0),
        "subscription_status": user.get("subscription_status", "free")
    }
