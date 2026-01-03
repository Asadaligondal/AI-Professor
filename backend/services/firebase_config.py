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
    
    Returns:
        firestore.Client: Initialized Firestore database client
        
    Raises:
        ValueError: If service account JSON not found or invalid
        Exception: If Firebase initialization fails
    """
    global _db
    
    if _db is not None:
        return _db
    
    try:
        # Look for Firebase service account JSON in backend directory
        backend_dir = Path(__file__).parent.parent
        
        # Check for service account file
        service_account_files = list(backend_dir.glob("*firebase*.json"))
        
        if not service_account_files:
            raise ValueError(
                "Firebase service account JSON not found in backend directory. "
                "Please download it from Firebase Console and place it in the backend/ folder."
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
        
        # Initialize Firebase Admin SDK with Storage bucket
        cred = credentials.Certificate(str(service_account_path))
        firebase_admin.initialize_app(cred, {
            'storageBucket': f"{service_account_data['project_id']}.appspot.com"
        })
        
        # Get Firestore client
        _db = firestore.client()
        
        print(f"✅ Firebase initialized successfully with project: {service_account_data['project_id']}")
        print(f"✅ Storage bucket: {service_account_data['project_id']}.appspot.com")
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
