# 🚀 AI Exam Grader - Setup Guide

## Prerequisites
- Node.js 20+ and npm
- Python 3.11+
- Docker Desktop (for PostgreSQL)
- Clerk account (free tier works)
- OpenAI API key

## 🔧 Backend Setup

### 1. Start PostgreSQL Database
```powershell
cd c:\Users\victus\Downloads\My_projects\My_Idea3
docker-compose up postgres -d
```

### 2. Configure Backend Environment
```powershell
cd backend
cp .env.template .env
```

Edit `backend/.env`:
```env
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/exam_grader
OPENAI_API_KEY=your_openai_api_key_here
```

### 3. Install Python Dependencies
```powershell
# Activate virtual environment
cd backend
.\.venv\Scripts\activate

# Install packages
pip install -r requirements.txt
```

### 4. Run Database Migrations
```powershell
alembic upgrade head
```

### 5. Start Backend Server
```powershell
uvicorn main:app --reload
```
Backend should be running at http://localhost:8000

## 🎨 Frontend Setup

### 1. Configure Clerk Authentication

1. Go to https://dashboard.clerk.com
2. Create a new application
3. Choose "Next.js" as the framework
4. Copy your API keys

### 2. Configure Frontend Environment

```powershell
cd frontend
```

Edit `frontend/.env.local`:
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 3. Install Dependencies & Start Dev Server
```powershell
npm install
npm run dev
```

Frontend should be running at http://localhost:3000

## 🧪 Testing the Application

### 1. Sign Up / Sign In
- Navigate to http://localhost:3000
- Click "Sign In" (Clerk will handle authentication)
- Create an account or sign in

### 2. Create a New Exam
1. Go to Dashboard → "New Exam"
2. Upload Professor's Answer Key PDF (1 file)
3. Upload Student Papers PDFs (multiple files)
4. Click "Grade Exam"
5. Wait for processing (OpenAI Vision API)
6. View results with detailed scores and feedback

## 📁 Project Structure

```
My_Idea3/
├── backend/
│   ├── app/
│   │   ├── models.py          # Database models
│   │   ├── schemas.py         # Pydantic schemas
│   │   ├── database.py        # DB connection
│   │   └── routers/
│   │       └── grading.py     # Grading endpoints
│   ├── services/
│   │   └── ai_grader.py       # OpenAI Vision integration
│   ├── alembic/               # Database migrations
│   ├── main.py                # FastAPI app
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── dashboard/
│   │   │   ├── page.tsx       # Main dashboard
│   │   │   └── new-exam/
│   │   │       └── page.tsx   # Exam creation form
│   │   ├── layout.tsx         # Root layout with Clerk
│   │   ├── middleware.ts      # Route protection
│   │   └── providers.tsx      # React Query setup
│   ├── components/
│   │   ├── ui/                # shadcn/ui components
│   │   └── file-upload-zone.tsx
│   ├── lib/
│   │   ├── api-client.ts      # Axios instance
│   │   └── api.ts             # API service functions
│   └── types/
│       └── index.ts           # TypeScript interfaces
└── docker-compose.yml
```

## 🔑 API Endpoints

### Backend API (http://localhost:8000)

#### POST /api/v1/grade
Grade exam submissions

**Request:**
- `Content-Type: multipart/form-data`
- `professor_key`: PDF file (answer key)
- `student_papers`: PDF files (multiple students)

**Response:**
```json
{
  "exam_id": "uuid",
  "total_questions": 10,
  "results": [
    {
      "student_number": 1,
      "score": 85,
      "max_score": 100,
      "percentage": 85.0,
      "questions": [...]
    }
  ]
}
```

#### GET /docs
Interactive API documentation (Swagger UI)

## 🛠️ Development Commands

### Backend
```powershell
# Activate venv
cd backend
.\.venv\Scripts\activate

# Run server with hot reload
uvicorn main:app --reload

# Create new migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback migration
alembic downgrade -1
```

### Frontend
```powershell
cd frontend

# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type checking
npm run type-check

# Linting
npm run lint
```

### Database
```powershell
# Connect to PostgreSQL
docker exec -it exam_grader_postgres psql -U postgres -d exam_grader

# View tables
\dt

# View specific table
SELECT * FROM exams LIMIT 10;

# Stop database
docker-compose down
```

## 🐛 Troubleshooting

### Backend Issues

**Database connection error:**
```
Ensure Docker Desktop is running
docker-compose up postgres -d
Check DATABASE_URL uses postgresql+psycopg:// format
```

**OpenAI API error:**
```
Verify OPENAI_API_KEY in backend/.env
Check you have GPT-4 Vision API access
Ensure you have credits in your OpenAI account
```

**Package installation fails:**
```
Use Python 3.11 (not 3.14)
Upgrade pip: python -m pip install --upgrade pip
On Windows, use psycopg[binary] not psycopg2
```

### Frontend Issues

**Clerk authentication not working:**
```
Verify keys in frontend/.env.local
Ensure NEXT_PUBLIC_ prefix for client-side keys
Check Clerk dashboard for correct application
```

**API calls failing:**
```
Check backend is running on port 8000
Verify NEXT_PUBLIC_API_URL in .env.local
Check browser console for CORS errors
```

**Build errors:**
```
Delete .next folder: rm -rf .next
Clear node_modules: rm -rf node_modules && npm install
Check Node.js version: node --version (should be 20+)
```

## 📚 Tech Stack

### Frontend
- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui
- **Authentication:** Clerk
- **Data Fetching:** React Query (TanStack Query)
- **HTTP Client:** Axios
- **File Uploads:** react-dropzone
- **Notifications:** Sonner

### Backend
- **Framework:** FastAPI
- **Language:** Python 3.11
- **ORM:** SQLAlchemy 2.0
- **Migrations:** Alembic
- **Database Driver:** psycopg v3
- **AI Service:** OpenAI Vision API (GPT-4o)
- **PDF Processing:** PyMuPDF (fitz)
- **Image Processing:** Pillow (PIL)

### Infrastructure
- **Database:** PostgreSQL 16
- **Container Runtime:** Docker & Docker Compose
- **API Documentation:** OpenAPI/Swagger

## 🚨 Important Notes

1. **Database URL Format:** Must use `postgresql+psycopg://` (not `postgresql://` or `postgresql+psycopg2://`)
2. **Clerk Keys:** `NEXT_PUBLIC_` prefix is required for client-side environment variables
3. **File Size Limits:** Default 50MB per file in file-upload-zone component
4. **OpenAI Model:** Uses GPT-4o (gpt-4-1106-vision-preview) for vision capabilities
5. **PDF Processing:** Converts PDFs to images at 300 DPI for best accuracy

## 🎯 Next Steps

After setup is complete:

1. **Add More Pages:**
   - Exams list page (`/dashboard/exams`)
   - Results viewing/editing page
   - User profile page

2. **Enhance Features:**
   - Export results to Excel
   - Email notifications
   - Bulk operations
   - Analytics dashboard

3. **Production Deployment:**
   - Set up Vercel for frontend
   - Configure Railway/Render for backend
   - Use managed PostgreSQL (Neon, Supabase)
   - Add Redis for caching
   - Set up monitoring (Sentry, LogRocket)

## 📧 Support

For issues or questions:
- Check the troubleshooting section above
- Review API docs at http://localhost:8000/docs
- Check Clerk documentation at https://clerk.com/docs

---

**Made with ❤️ using Next.js, FastAPI, and OpenAI**
