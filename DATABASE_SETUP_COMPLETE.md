# Database Layer Setup - Complete ✅

## Summary

The complete database layer has been set up with SQLAlchemy, Alembic migrations, and matching TypeScript interfaces.

## What Was Created

### Backend (FastAPI + SQLAlchemy)

#### 1. Database Configuration
- **File**: [backend/app/database.py](backend/app/database.py)
  - Database engine configuration with connection pooling
  - Session management
  - Database URL using psycopg (PostgreSQL adapter for Python)
  - Dependency injection for database sessions

- **File**: [backend/app/config.py](backend/app/config.py)
  - Pydantic Settings for environment variable management
  - Centralized configuration for API keys and database

#### 2. Database Models
- **File**: [backend/app/models.py](backend/app/models.py)

Four main models matching the AI SaaS exam grading system:

**User Model**:
- Clerk authentication integration (`clerk_id`)
- Subscription management (FREE, BASIC, PRO, ENTERPRISE)
- Stripe integration fields
- Usage tracking

**Exam Model**:
- Exam details (title, description, subject)
- Answer key PDF URL and storage path
- Grading configuration (total marks, passing marks, criteria)
- AI processing status
- Relationships to questions and submissions

**QuestionDetail Model**:
- Individual question information extracted from answer keys
- Question text, type, and correct answers
- Marks allocation and difficulty levels
- Keywords for AI grading assistance

**Submission Model**:
- Student information (name, roll number, email)
- Submission PDF URL
- Grading results (JSON structure for flexibility)
- AI-generated feedback
- Grade levels (A+, A, A-, B+, etc.)
- Processing status tracking

#### 3. Pydantic Schemas
- **File**: [backend/app/schemas.py](backend/app/schemas.py)
  - Request/response validation schemas
  - Create, Update, and Response schemas for each model
  - Grading-specific schemas (QuestionGrade, GradeResult)
  - Pagination and utility schemas

#### 4. Alembic Migrations
- **Directory**: [backend/alembic/](backend/alembic/)
- **Config**: [backend/alembic.ini](backend/alembic.ini)
- **Environment**: [backend/alembic/env.py](backend/alembic/env.py)
  - Configured to auto-detect models
  - Uses environment variables for database URL
  - Ready to generate and apply migrations

**Migration Commands**:
```bash
# Create migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

#### 5. Updated Main Application
- **File**: [backend/main.py](backend/main.py)
  - Lifespan context manager
  - Automatic database table creation on startup
  - Graceful error handling for database connection issues

### Frontend (Next.js + TypeScript)

#### TypeScript Interfaces
- **File**: [frontend/types/database.ts](frontend/types/database.ts)
  - Complete type definitions matching backend models
  - Enums for subscription tiers, grade levels, statuses
  - Request/Response interfaces
  - API response types
  - Grading result types

- **File**: [frontend/types/index.ts](frontend/types/index.ts)
  - Central export point for all types

### Docker & Environment

#### Updated Docker Compose
- **File**: [docker-compose.yml](docker-compose.yml)
  - PostgreSQL 16 with health checks
  - Correct database URL format (`postgresql+psycopg://`)
  - Volume persistence for data
  - Service dependencies configured

#### Environment Variables
- **File**: [.env.template](.env.template)
  - Updated with correct PostgreSQL URL format
  - All required API keys templated
  - Database connection parameters

## Database Schema

```
┌─────────────────────────────────────────────────────────────┐
│                          users                               │
├─────────────────────────────────────────────────────────────┤
│ id (PK)                                                      │
│ clerk_id (UK)                                                │
│ email (UK)                                                   │
│ subscription_status (ENUM)                                   │
│ stripe_customer_id, stripe_subscription_id                   │
│ created_at, updated_at                                       │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    │ (1:N)
                    │
┌───────────────────▼─────────────────────────────────────────┐
│                          exams                               │
├─────────────────────────────────────────────────────────────┤
│ id (PK)                                                      │
│ owner_id (FK → users)                                        │
│ title, description, subject                                  │
│ answer_key_pdf_url                                           │
│ processing_status, is_processed                              │
│ total_marks, passing_marks                                   │
│ grading_criteria (JSON)                                      │
└───────┬───────────────────┬─────────────────────────────────┘
        │                   │
        │ (1:N)             │ (1:N)
        │                   │
┌───────▼─────────┐   ┌─────▼───────────────────────────────┐
│ question_details│   │        submissions                  │
├─────────────────┤   ├─────────────────────────────────────┤
│ id (PK)         │   │ id (PK)                             │
│ exam_id (FK)    │   │ exam_id (FK → exams)                │
│ question_number │   │ student_name, roll_number, email    │
│ correct_answer  │   │ submission_pdf_url                  │
│ marks_allocated │   │ grade_json (JSON)                   │
│ keywords (JSON) │   │ total_marks_obtained, percentage    │
└─────────────────┘   │ grade (ENUM), grading_status        │
                      │ ai_feedback                          │
                      └─────────────────────────────────────┘
```

## Key Features

### 1. Clerk Authentication Integration
- `clerk_id` field in User model
- Ready for Clerk user sync

### 2. Stripe Subscription Management
- Subscription tier tracking
- Customer and subscription ID storage
- Usage limits enforcement ready

### 3. AI Grading System
- Flexible JSON storage for grading results
- Question-level feedback
- AI-generated feedback fields
- Processing status tracking

### 4. Type Safety
- Backend: Pydantic validation
- Frontend: TypeScript interfaces
- Matching schemas across stack

### 5. File Storage Ready
- URL fields for PDFs (answer keys, submissions)
- Storage path tracking for cloud storage integration

## Next Steps

### To Complete Database Setup:

1. **Start PostgreSQL**:
   ```bash
   docker-compose up postgres -d
   ```

2. **Run Migrations**:
   ```bash
   cd backend
   .\venv\Scripts\Activate.ps1
   alembic revision --autogenerate -m "Initial schema"
   alembic upgrade head
   ```

3. **Test Database Connection**:
   ```bash
   # Start backend
   uvicorn main:app --reload
   
   # Check http://localhost:8000/health
   ```

### For Development:

1. **Copy environment template**:
   ```bash
   cp .env.template .env
   # Edit .env with your credentials
   ```

2. **Use Docker Compose** (recommended):
   ```bash
   docker-compose up --build
   ```

3. **Or run services individually**:
   ```bash
   # Terminal 1: Database
   docker-compose up postgres
   
   # Terminal 2: Backend
   cd backend
   .\venv\Scripts\Activate.ps1
   uvicorn main:app --reload
   
   # Terminal 3: Frontend
   cd frontend
   npm run dev
   ```

## Files Modified/Created

### Created:
- `backend/app/database.py` - Database configuration
- `backend/app/config.py` - Settings management
- `backend/app/models.py` - SQLAlchemy models
- `backend/app/schemas.py` - Pydantic schemas
- `backend/alembic/` - Migration directory
- `backend/alembic.ini` - Alembic configuration
- `backend/DATABASE_SETUP.md` - Setup guide
- `frontend/types/database.ts` - TypeScript interfaces
- `frontend/types/index.ts` - Type exports

### Modified:
- `backend/main.py` - Added database initialization
- `backend/requirements.txt` - Updated to psycopg v3
- `docker-compose.yml` - Fixed database URL format
- `.env.template` - Updated database URL

## Database URL Format

**Important**: Using the new `psycopg` driver (v3), the database URL format is:

```
postgresql+psycopg://user:password@host:port/database
```

Not the old format: `postgresql://...`

This is already configured in all files.

## Troubleshooting

### Database Connection Issues:
1. Ensure PostgreSQL is running: `docker-compose ps`
2. Check database URL format includes `+psycopg`
3. Verify credentials in `.env` file

### Migration Issues:
1. Ensure models are imported in `app/__init__.py`
2. Check database is accessible
3. Review migration file before applying

### Type Errors (Frontend):
1. TypeScript interfaces match backend models exactly
2. Import from `@/types` for consistency
3. Use provided enums for status fields

---

✅ **Database layer is now fully configured and ready for development!**
