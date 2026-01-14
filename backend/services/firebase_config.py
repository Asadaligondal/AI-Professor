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
    Priority:
    1. Render Secret File (/etc/secrets/...)
    2. Render Env Variable (FIREBASE_CREDENTIALS_JSON)
    3. Local File (*firebase*.json)
    """
    global _db
    
    if _db is not None:
        return _db
    
    try:
        cred = None
        project_id = None
        
        # --- STRATEGY 1: CHECK FOR RENDER SECRET FILES ---
        # We check both names just in case you named it differently in the "Secret Files" menu
        possible_render_paths = [
            "/etc/secrets/firebase_credentials.json", 
            "/etc/secrets/ai-professor-643e8-firebase-adminsdk-fbsvc-e1ebc9bdd6" 
        ]
        
        found_secret_path = None
        for path in possible_render_paths:
            if os.path.exists(path):
                found_secret_path = path
                break
        
        if found_secret_path:
            print(f"🔧 (Render) Initializing Firebase from Secret File: {found_secret_path}")
            cred = credentials.Certificate(found_secret_path)
            # Read the file to get the project_id for the bucket url
            with open(found_secret_path, 'r') as f:
                data = json.load(f)
                project_id = data.get('project_id')

        # --- STRATEGY 2: CHECK FOR ENV VARIABLE (Legacy Render Setup) ---
        elif os.getenv('FIREBASE_CREDENTIALS_JSON'):
            print("🔧 (Render) Initializing Firebase from environment variable string")
            firebase_creds_json = os.getenv('FIREBASE_CREDENTIALS_JSON')
            service_account_data = json.loads(firebase_creds_json)
            cred = credentials.Certificate(service_account_data)
            project_id = service_account_data.get('project_id')

        # --- STRATEGY 3: LOCAL DEVELOPMENT (Your existing working code) ---
        else:
            print("🔧 (Local) Initializing Firebase from local JSON file")
            backend_dir = Path(__file__).parent.parent
            
            # Check for service account file
            service_account_files = list(backend_dir.glob("*firebase*.json"))
            
            if not service_account_files:
                raise ValueError(
                    "Firebase service account JSON not found. "
                    "For local dev: Place JSON in backend/ folder. "
                )
            
            service_account_path = service_account_files[0]
            cred = credentials.Certificate(str(service_account_path))
            
            # Get project_id from the local file
            with open(service_account_path, 'r') as f:
                data = json.load(f)
                project_id = data.get('project_id')

        # --- FINAL INITIALIZATION ---
        # Avoid re-initializing if the app is already running
        if not firebase_admin._apps:
            print(f"🚀 Initializing new Firebase App for project: {project_id}")
            firebase_admin.initialize_app(cred, {
                'storageBucket': f"{project_id}.appspot.com"
            })
        else:
             print("ℹ️ Firebase App already initialized, reusing.")
        
        # Get Firestore client
        _db = firestore.client()
        
        print(f"✅ Firebase initialized successfully!")
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
