"""Firestore Data Models and Helper Functions

NoSQL Schema Design:

Collections:
1. users (root collection)
   - Document ID: clerk_user_id (string)
   - Fields: {
       clerk_id: string,
       email: string,
       credits: number,
       subscription_status: string,
       stripe_customer_id: string (optional),
       created_at: timestamp,
       updated_at: timestamp
     }

2. exams (root collection)
   - Document ID: auto-generated
   - Fields: {
       teacher_id: string (clerk_user_id),
       title: string,
       answer_key_url: string,
       answer_key_data: object (parsed answer key),
       max_marks: number,
       created_at: timestamp,
       updated_at: timestamp
     }

3. submissions (root collection)
   - Document ID: auto-generated
   - Fields: {
       exam_id: string (reference to exams),
       student_name: string,
       roll_number: string,
       submission_file_url: string,
       status: string (pending/processing/completed/error),
       total_score: number,
       ai_feedback: string,
       grade_json: object {
         total_marks: number,
         obtained_marks: number,
         results: array of question results
       },
       graded_at: timestamp,
       created_at: timestamp,
       updated_at: timestamp
     }

4. payments (root collection)
   - Document ID: auto-generated
   - Fields: {
       user_id: string (clerk_user_id),
       amount: number,
       currency: string,
       credits_purchased: number,
       payment_method: string (jazzcash/safepay),
       transaction_id: string,
       status: string,
       created_at: timestamp
     }
"""

from datetime import datetime
from typing import Optional, Dict, Any, List
from google.cloud.firestore_v1 import SERVER_TIMESTAMP
from services.firebase_config import get_db, Collections


class FirestoreHelper:
    """Helper class for Firestore CRUD operations"""
    
    @staticmethod
    def convert_firestore_doc(data: Dict[str, Any]) -> Dict[str, Any]:
        """Convert Firestore DatetimeWithNanoseconds to ISO string for JSON serialization"""
        if not data:
            return data
        
        converted = {}
        for key, value in data.items():
            # Check if it's a datetime-like object with isoformat method
            if hasattr(value, 'isoformat') and hasattr(value, 'timestamp'):
                # Convert to ISO format string
                converted[key] = value.isoformat()
            elif isinstance(value, dict):
                # Recursively convert nested dicts
                converted[key] = FirestoreHelper.convert_firestore_doc(value)
            elif isinstance(value, list):
                # Convert items in lists
                converted[key] = [
                    FirestoreHelper.convert_firestore_doc(item) if isinstance(item, dict)
                    else item.isoformat() if (hasattr(item, 'isoformat') and hasattr(item, 'timestamp'))
                    else item
                    for item in value
                ]
            else:
                converted[key] = value
        return converted
    
    @staticmethod
    def get_timestamp():
        """Get server timestamp for Firestore"""
        return SERVER_TIMESTAMP
    
    # ==================== USERS ====================
    
    @staticmethod
    def get_user(clerk_id: str) -> Optional[Dict[str, Any]]:
        """Get user by Clerk ID"""
        db = get_db()
        doc = db.collection(Collections.USERS).document(clerk_id).get()
        if doc.exists:
            data = doc.to_dict()
            return FirestoreHelper.convert_firestore_doc(data)
        return None
    
    @staticmethod
    def create_user(clerk_id: str, email: str, initial_credits: int = 5) -> Dict[str, Any]:
        """Create a new user document"""
        db = get_db()
        user_data = {
            "clerk_id": clerk_id,
            "email": email,
            "credits": initial_credits,
            "subscription_status": "free",
            "stripe_customer_id": None,
            "created_at": SERVER_TIMESTAMP,
            "updated_at": SERVER_TIMESTAMP
        }
        db.collection(Collections.USERS).document(clerk_id).set(user_data)
        return user_data
    
    @staticmethod
    def update_user_credits(clerk_id: str, credits: int) -> None:
        """Update user credits"""
        db = get_db()
        db.collection(Collections.USERS).document(clerk_id).update({
            "credits": credits,
            "updated_at": SERVER_TIMESTAMP
        })
    
    @staticmethod
    def increment_user_credits(clerk_id: str, amount: int) -> None:
        """Increment user credits by amount"""
        db = get_db()
        from google.cloud import firestore
        user_ref = db.collection(Collections.USERS).document(clerk_id)
        user_ref.update({
            "credits": firestore.Increment(amount),
            "updated_at": SERVER_TIMESTAMP
        })
    
    @staticmethod
    def decrement_user_credits(clerk_id: str, amount: int = 1) -> bool:
        """
        Decrement user credits by amount. Returns True if successful, False if insufficient credits.
        """
        db = get_db()
        user_ref = db.collection(Collections.USERS).document(clerk_id)
        user = user_ref.get()
        
        if not user.exists:
            return False
        
        user_data = user.to_dict()
        current_credits = user_data.get("credits", 0)
        
        if current_credits < amount:
            return False
        
        from google.cloud import firestore
        user_ref.update({
            "credits": firestore.Increment(-amount),
            "updated_at": SERVER_TIMESTAMP
        })
        return True
    
    # ==================== EXAMS ====================
    
    @staticmethod
    def create_exam(
        teacher_id: str,
        title: str,
        answer_key_url: str,
        answer_key_data: Dict[str, Any],
        max_marks: int
    ) -> str:
        """Create a new exam and return its document ID"""
        db = get_db()
        exam_data = {
            "teacher_id": teacher_id,
            "title": title,
            "answer_key_url": answer_key_url,
            "answer_key_data": answer_key_data,
            "max_marks": max_marks,
            "created_at": SERVER_TIMESTAMP,
            "updated_at": SERVER_TIMESTAMP
        }
        doc_ref = db.collection(Collections.EXAMS).document()
        doc_ref.set(exam_data)
        return doc_ref.id
    
    @staticmethod
    def get_exam(exam_id: str) -> Optional[Dict[str, Any]]:
        """Get exam by ID"""
        db = get_db()
        doc = db.collection(Collections.EXAMS).document(exam_id).get()
        if doc.exists:
            data = doc.to_dict()
            data["id"] = doc.id
            # Convert Firestore timestamps to ISO strings
            return FirestoreHelper.convert_firestore_doc(data)
        return None
    
    @staticmethod
    def get_user_exams(teacher_id: str) -> List[Dict[str, Any]]:
        """Get all exams created by a teacher"""
        db = get_db()
        # Simple query without ordering to avoid index requirement
        docs = db.collection(Collections.EXAMS).where("teacher_id", "==", teacher_id).stream()
        
        exams = []
        for doc in docs:
            data = doc.to_dict()
            data["id"] = doc.id
            # Convert Firestore timestamps to ISO strings
            exams.append(FirestoreHelper.convert_firestore_doc(data))
        
        # Sort in Python instead of Firestore to avoid index requirement
        # Handle both string (ISO) and numeric timestamps
        def get_sort_key(exam):
            created = exam.get("created_at", 0)
            if isinstance(created, str):
                try:
                    from datetime import datetime
                    return datetime.fromisoformat(created.replace('Z', '+00:00')).timestamp()
                except:
                    return 0
            return created if isinstance(created, (int, float)) else 0
        
        exams.sort(key=get_sort_key, reverse=True)
        return exams
    
    @staticmethod
    def update_exam(exam_id: str, updates: Dict[str, Any]) -> None:
        """Update exam fields"""
        db = get_db()
        updates["updated_at"] = SERVER_TIMESTAMP
        db.collection(Collections.EXAMS).document(exam_id).update(updates)
    
    @staticmethod
    def delete_exam(exam_id: str) -> None:
        """Delete an exam"""
        db = get_db()
        db.collection(Collections.EXAMS).document(exam_id).delete()
    
    # ==================== SUBMISSIONS ====================
    
    @staticmethod
    def create_submission(
        exam_id: str,
        student_name: str,
        roll_number: str,
        submission_file_url: str
    ) -> str:
        """Create a new submission and return its document ID"""
        db = get_db()
        submission_data = {
            "exam_id": exam_id,
            "student_name": student_name,
            "roll_number": roll_number,
            "submission_file_url": submission_file_url,
            "status": "pending",
            "total_score": 0,
            "ai_feedback": "",
            "grade_json": None,
            "graded_at": None,
            "created_at": SERVER_TIMESTAMP,
            "updated_at": SERVER_TIMESTAMP
        }
        doc_ref = db.collection(Collections.SUBMISSIONS).document()
        doc_ref.set(submission_data)
        return doc_ref.id
    
    @staticmethod
    def get_submission(submission_id: str) -> Optional[Dict[str, Any]]:
        """Get submission by ID"""
        db = get_db()
        doc = db.collection(Collections.SUBMISSIONS).document(submission_id).get()
        if doc.exists:
            data = doc.to_dict()
            data["id"] = doc.id
            # Convert Firestore timestamps to ISO strings
            return FirestoreHelper.convert_firestore_doc(data)
        return None
    
    @staticmethod
    def get_exam_submissions(exam_id: str) -> List[Dict[str, Any]]:
        """Get all submissions for an exam"""
        db = get_db()
        docs = db.collection(Collections.SUBMISSIONS).where("exam_id", "==", exam_id).stream()
        
        submissions = []
        for doc in docs:
            data = doc.to_dict()
            data["id"] = doc.id
            # Convert Firestore timestamps to ISO strings
            submissions.append(FirestoreHelper.convert_firestore_doc(data))
        return submissions
    
    @staticmethod
    def update_submission(submission_id: str, updates: Dict[str, Any]) -> None:
        """Update submission fields"""
        db = get_db()
        updates["updated_at"] = SERVER_TIMESTAMP
        db.collection(Collections.SUBMISSIONS).document(submission_id).update(updates)
    
    @staticmethod
    def update_submission_status(submission_id: str, status: str) -> None:
        """Update submission status"""
        db = get_db()
        db.collection(Collections.SUBMISSIONS).document(submission_id).update({
            "status": status,
            "updated_at": SERVER_TIMESTAMP
        })
    
    @staticmethod
    def complete_grading(
        submission_id: str,
        total_score: float,
        grade_json: Dict[str, Any],
        ai_feedback: str
    ) -> None:
        """Mark submission as graded with results"""
        db = get_db()
        db.collection(Collections.SUBMISSIONS).document(submission_id).update({
            "status": "completed",
            "total_score": total_score,
            "grade_json": grade_json,
            "ai_feedback": ai_feedback,
            "graded_at": SERVER_TIMESTAMP,
            "updated_at": SERVER_TIMESTAMP
        })
    
    @staticmethod
    def delete_submission(submission_id: str) -> None:
        """Delete a submission"""
        db = get_db()
        db.collection(Collections.SUBMISSIONS).document(submission_id).delete()
    
    # ==================== PAYMENTS ====================
    
    @staticmethod
    def create_payment(
        user_id: str,
        amount: float,
        currency: str,
        credits_purchased: int,
        payment_method: str,
        transaction_id: str,
        status: str = "pending"
    ) -> str:
        """Create a payment record and return its document ID"""
        db = get_db()
        payment_data = {
            "user_id": user_id,
            "amount": amount,
            "currency": currency,
            "credits_purchased": credits_purchased,
            "payment_method": payment_method,
            "transaction_id": transaction_id,
            "status": status,
            "created_at": SERVER_TIMESTAMP
        }
        doc_ref = db.collection(Collections.PAYMENTS).document()
        doc_ref.set(payment_data)
        return doc_ref.id
    
    @staticmethod
    def get_user_payments(user_id: str) -> List[Dict[str, Any]]:
        """Get all payments for a user"""
        db = get_db()
        docs = db.collection(Collections.PAYMENTS).where("user_id", "==", user_id).order_by("created_at", direction="DESCENDING").stream()
        
        payments = []
        for doc in docs:
            data = doc.to_dict()
            data["id"] = doc.id
            payments.append(data)
        return payments
    
    @staticmethod
    def update_payment_status(payment_id: str, status: str) -> None:
        """Update payment status"""
        db = get_db()
        db.collection(Collections.PAYMENTS).document(payment_id).update({
            "status": status
        })
