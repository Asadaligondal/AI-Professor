"""
Dependencies for API endpoints
Includes authentication, authorization, and credit checking
"""

from fastapi import Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.models import User


async def check_credits(
    x_clerk_user_id: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> User:
    """
    Dependency to check if user has sufficient credits
    
    This middleware:
    1. Fetches the user from the database using Clerk ID from header
    2. Checks if user has credits > 0
    3. Returns user object if credits available
    4. Raises 403 Forbidden if insufficient credits
    
    Args:
        x_clerk_user_id: Clerk user ID from request header
        db: Database session
        
    Returns:
        User object if credits are sufficient
        
    Raises:
        HTTPException: 401 if no user ID provided, 404 if user not found,
                      403 if insufficient credits
    """
    if not x_clerk_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User ID not provided in headers"
        )
    
    # Fetch user from database
    user = db.query(User).filter(User.clerk_id == x_clerk_user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if user has credits
    if user.credits <= 0:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient credits. Please upgrade to Pro."
        )
    
    return user


async def get_current_user(
    x_clerk_user_id: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """
    Get current user without credit check (for read-only endpoints)
    
    Args:
        x_clerk_user_id: Clerk user ID from request header
        db: Database session
        
    Returns:
        User object or None
    """
    if not x_clerk_user_id:
        return None
    
    user = db.query(User).filter(User.clerk_id == x_clerk_user_id).first()
    return user
