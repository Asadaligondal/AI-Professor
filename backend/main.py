from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv

# Import database components
from app.database import engine, Base
from app import models  # This registers all models with Base

# Import routers
from app.routers import grading_router
from app.routers.exams import router as exams_router
from app.routers.payments import router as payments_router
from app.routers.websocket import router as websocket_router

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup and shutdown events.
    Creates database tables on startup.
    """
    # Startup: Create database tables
    print("🚀 Starting up - Creating database tables...")
    try:
        Base.metadata.create_all(bind=engine)
        print("✅ Database tables created successfully")
    except Exception as e:
        print(f"⚠️  Database connection error: {e}")
        print("   The API will start, but database operations will fail until DB is available.")
    
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
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(grading_router)
app.include_router(exams_router)
app.include_router(payments_router)
app.include_router(websocket_router)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Welcome to AI SaaS API - Exam Grading System",
        "status": "operational",
        "version": "1.0.0",
        "database": "configured",
        "features": [
            "AI-Powered Exam Grading",
            "Multi-page PDF Processing",
            "Batch Student Grading",
            "Vision AI Integration"
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
