from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv

# Import Firebase initialization
from services.firebase_config import initialize_firebase

# Import routers
from app.routers import grading_router
from app.routers.exams import router as exams_router
from app.routers.payments import router as payments_router
from app.routers.websocket import router as websocket_router
from app.routers.dashboard_firestore import router as dashboard_router

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup and shutdown events.
    Initializes Firebase on startup.
    """
    # Startup: Initialize Firebase
    print("🚀 Starting up - Initializing Firebase...")
    try:
        initialize_firebase()
        print("✅ Firebase initialized successfully")
    except Exception as e:
        print(f"⚠️  Firebase initialization error: {e}")
        print("   The API will start, but database operations will fail until Firebase is configured.")
    
    yield
    
    # Shutdown
    print("👋 Shutting down...")


app = FastAPI(
    title="AI SaaS API - Exam Grading System",
    description="Backend API for AI-Powered Exam Grading Application with Vision AI",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration to allow frontend communication
allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

# Add production URL from environment if exists
frontend_url = os.getenv("FRONTEND_URL")
if frontend_url:
    allowed_origins.append(frontend_url)
    print(f"✅ Added production frontend URL to CORS: {frontend_url}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Include routers
app.include_router(grading_router)
app.include_router(exams_router)
app.include_router(payments_router)
app.include_router(websocket_router)
app.include_router(dashboard_router)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Welcome to AI SaaS API - Exam Grading System",
        "status": "operational",
        "version": "2.0.0",
        "database": "Firebase Firestore",
        "features": [
            "AI-Powered Exam Grading",
            "Multi-page PDF Processing",
            "Batch Student Grading",
            "Vision AI Integration",
            "Cloud-Native NoSQL Database"
        ]
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "backend-api",
        "grading_service": "available"
    }


@app.get("/api/test")
async def test_endpoint():
    """Test endpoint for frontend-backend communication"""
    return {
        "message": "Backend connection successful",
        "data": "This is a test response from FastAPI"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
