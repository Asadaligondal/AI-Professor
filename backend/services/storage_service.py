"""
Firebase Storage Service
Handles file uploads to Firebase Cloud Storage
"""

import logging
from typing import Optional
from datetime import timedelta
from firebase_admin import storage

logger = logging.getLogger(__name__)


class StorageService:
    """Service for managing file uploads to Firebase Storage"""
    
    def __init__(self):
        try:
            self.bucket = storage.bucket()
            logger.info(f"✅ Storage bucket initialized: {self.bucket.name}")
        except Exception as e:
            error_msg = str(e).lower()
            if "bucket does not exist" in error_msg or "not found" in error_msg:
                logger.warning("⚠️ Firebase Storage bucket not configured - uploads disabled (using UploadThing)")
            else:
                logger.error(f"❌ Failed to initialize Storage bucket: {str(e)}")
                logger.error("⚠️ Make sure Firebase Storage is enabled in your Firebase project")
            self.bucket = None
    
    def upload_file(
        self,
        file_data: bytes,
        destination_path: str,
        content_type: str = "application/pdf"
    ) -> str:
        """
        Upload a file to Firebase Storage
        
        Args:
            file_data: Binary file data
            destination_path: Path in storage (e.g., "exams/exam123/answer_key.pdf")
            content_type: MIME type of the file
        
        Returns:
            Public download URL
        """
        if not self.bucket:
            logger.warning("⚠️ Storage bucket not available, skipping upload")
            return ""
        
        try:
            blob = self.bucket.blob(destination_path)
            blob.upload_from_string(file_data, content_type=content_type)
            
            # Make the blob publicly accessible
            blob.make_public()
            
            logger.info(f"✅ Uploaded file to: {destination_path}")
            return blob.public_url
            
        except Exception as e:
            error_msg = str(e).lower()
            if "bucket does not exist" in error_msg or "not found" in error_msg:
                logger.warning(f"⚠️ Firebase Storage bucket not configured, skipping upload: {destination_path}")
            else:
                logger.error(f"❌ Failed to upload file to {destination_path}: {str(e)}")
            return ""
    
    def get_signed_url(self, blob_path: str, expiration_minutes: int = 60) -> str:
        """
        Generate a signed URL for private file access
        
        Args:
            blob_path: Path to file in storage
            expiration_minutes: How long the URL is valid
        
        Returns:
            Signed URL
        """
        try:
            blob = self.bucket.blob(blob_path)
            url = blob.generate_signed_url(
                expiration=timedelta(minutes=expiration_minutes),
                method='GET'
            )
            return url
        except Exception as e:
            logger.error(f"❌ Failed to generate signed URL for {blob_path}: {str(e)}")
            raise
    
    def delete_file(self, blob_path: str) -> bool:
        """
        Delete a file from storage
        
        Args:
            blob_path: Path to file in storage
        
        Returns:
            True if successful
        """
        try:
            blob = self.bucket.blob(blob_path)
            blob.delete()
            logger.info(f"🗑️ Deleted file: {blob_path}")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to delete {blob_path}: {str(e)}")
            return False
    
    def upload_professor_key(
        self,
        exam_id: str,
        file_data: bytes,
        filename: str
    ) -> str:
        """Upload professor's answer key PDF"""
        path = f"exams/{exam_id}/answer_key/{filename}"
        return self.upload_file(file_data, path)
    
    def upload_student_paper(
        self,
        exam_id: str,
        student_name: str,
        roll_number: str,
        file_data: bytes,
        filename: str
    ) -> str:
        """Upload individual student's paper PDF"""
        # Sanitize filename
        safe_student = student_name.replace(" ", "_").replace("/", "-")
        safe_roll = roll_number.replace(" ", "_").replace("/", "-")
        path = f"exams/{exam_id}/submissions/{safe_student}_{safe_roll}/{filename}"
        return self.upload_file(file_data, path)
    
    def upload_batch_student_papers(
        self,
        exam_id: str,
        file_data: bytes,
        filename: str
    ) -> str:
        """Upload the combined student papers PDF (before splitting)"""
        path = f"exams/{exam_id}/raw_submissions/{filename}"
        return self.upload_file(file_data, path)


# Singleton instance
_storage_service: Optional[StorageService] = None


def get_storage_service() -> StorageService:
    """Get or create storage service instance"""
    global _storage_service
    if _storage_service is None:
        _storage_service = StorageService()
    return _storage_service
