"""Quick script to check what data is stored for the latest exam"""
import sys
import json
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from app.models import Submission
from app.config import settings

# Create engine and session
engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

try:
    # Get the latest submission
    submission = db.query(Submission).order_by(Submission.id.desc()).first()
    
    if submission:
        print(f"\n=== Latest Submission (ID: {submission.id}) ===")
        print(f"Student: {submission.student_name}")
        print(f"Exam ID: {submission.exam_id}")
        print(f"\n=== Grade JSON Structure ===")
        
        if submission.grade_json:
            grade_json = submission.grade_json
            print(json.dumps(grade_json, indent=2))
            
            # Check first question for new fields
            if grade_json.get('results') and len(grade_json['results']) > 0:
                q = grade_json['results'][0]
                print(f"\n=== First Question Fields ===")
                print(f"Has 'rationale': {('rationale' in q)}")
                print(f"Has 'processed_answer': {('processed_answer' in q)}")
                print(f"Has 'expected_answer': {('expected_answer' in q)}")
                print(f"Has 'concept_alignment': {('concept_alignment' in q)}")
                
                if 'rationale' in q:
                    print(f"\nRationale data: {json.dumps(q['rationale'], indent=2)}")
        else:
            print("No grade_json found!")
    else:
        print("No submissions found in database!")
        
finally:
    db.close()
