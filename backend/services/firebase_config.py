"""Firebase Admin SDK Configuration and Initialization"""
import os
import json
from pathlib import Path
import firebase_admin
from firebase_admin import credentials, firestore
from typing import Optional

# Global Firestore client
_db: Optional[firestore.Client] = None


def initialize_firebase() -> firestore.Client:
    """
    Initialize Firebase Admin SDK and return Firestore client.
    Works both locally (JSON file) and on Render (environment variables).
    
    Returns:
        firestore.Client: Initialized Firestore database client
        
    Raises:
        ValueError: If credentials not found
        Exception: If Firebase initialization fails
    """
    global _db
    
    if _db is not None:
        return _db
    
    try:
        # Check if running on Render (environment variables set)
        firebase_creds_json = os.getenv('FIREBASE_CREDENTIALS_JSON')
        
        if firebase_creds_json:
            # Production: Use environment variable (Render)
            print("🔧 Initializing Firebase from environment variables (Production)")
            service_account_data = json.loads(firebase_creds_json)
            cred = credentials.Certificate(service_account_data)
            project_id = service_account_data.get('project_id', 'ai-professor-643e8')
            
        else:
            # Development: Use JSON file
            print("🔧 Initializing Firebase from local JSON file (Development)")
            backend_dir = Path(__file__).parent.parent
            
            # Check for service account file
            service_account_files = list(backend_dir.glob("*firebase*.json"))
            
            if not service_account_files:
                raise ValueError(
                    "Firebase service account JSON not found. "
                    "For local dev: Place JSON in backend/ folder. "
                    "For production: Set FIREBASE_CREDENTIALS_JSON environment variable."
                )
            
            service_account_path = service_account_files[0]
            
            # Validate JSON structure
            with open(service_account_path, 'r') as f:
                service_account_data = json.load(f)
                required_fields = ['project_id', 'private_key', 'client_email']
                if not all(field in service_account_data for field in required_fields):
                    raise ValueError(
                        f"Invalid service account JSON. Missing required fields: {required_fields}"
                    )
            
            cred = credentials.Certificate(str(service_account_path))
            project_id = service_account_data.get('project_id')
        
        # Initialize Firebase Admin SDK with Storage bucket
        firebase_admin.initialize_app(cred, {
            'storageBucket': f"{project_id}.appspot.com"
        })
        
        # Get Firestore client
        _db = firestore.client()
        
        print(f"✅ Firebase initialized successfully with project: {project_id}")
        print(f"✅ Storage bucket: {project_id}.appspot.com")
        return _db
        
    except Exception as e:
        print(f"❌ Failed to initialize Firebase: {str(e)}")
        raise


def get_db() -> firestore.Client:
    """
    Get Firestore database client (initializes if needed).
    
    Returns:
        firestore.Client: Firestore database client
    """
    if _db is None:
        return initialize_firebase()
    return _db


# Collection names (centralized for easy refactoring)
class Collections:
    USERS = "users"
    EXAMS = "exams"
    SUBMISSIONS = "submissions"
    PAYMENTS = "payments"
