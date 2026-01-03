# This file is kept for backwards compatibility but is no longer used.
# The application now uses Firebase Firestore instead of PostgreSQL.
# All database operations are handled through services/firebase_config.py
def get_db():
    """
    Dependency function to get database session.
    Use with FastAPI Depends() to inject into route handlers.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Create all tables
def init_db():
    """Initialize database tables"""
    Base.metadata.create_all(bind=engine)
