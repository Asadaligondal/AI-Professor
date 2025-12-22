# AI SaaS Full-Stack Monorepo

A professional full-stack AI SaaS application built with Next.js 15 and FastAPI.

## 🏗️ Project Structure

```
.
├── frontend/          # Next.js 15 application
│   ├── app/          # App Router pages
│   ├── components/   # React components
│   ├── lib/          # Utility functions
│   └── public/       # Static assets
├── backend/          # FastAPI application
│   ├── app/          # Application modules
│   ├── main.py       # FastAPI entry point
│   └── requirements.txt
├── docker-compose.yml
├── .env.template
└── .gitignore
```

## 🛠️ Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS
- **shadcn/ui** - Reusable component library

### Backend
- **FastAPI** - Modern Python web framework
- **Python 3.11** - Programming language
- **PostgreSQL** - Database
- **Uvicorn** - ASGI server

### Infrastructure
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- Python 3.11+
- Docker & Docker Compose (optional)

### Environment Setup

1. **Copy the environment template:**
   ```bash
   cp .env.template .env
   ```

2. **Fill in your API keys and secrets in `.env`**

### Option 1: Local Development (Without Docker)

#### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend will run at: http://localhost:3000

#### Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
Backend will run at: http://localhost:8000

API documentation: http://localhost:8000/docs

### Option 2: Docker Development

```bash
# Build and start all services
docker-compose up --build

# Run in detached mode
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f
```

Services will be available at:
- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- Database: localhost:5432

## 📦 Available Scripts

### Frontend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

### Backend
- `uvicorn main:app --reload` - Start development server
- `pytest` - Run tests (when configured)

## 🔌 API Integration

The frontend is already configured to communicate with the backend:

- **Development:** Uses `http://localhost:8000` or `NEXT_PUBLIC_API_URL` from `.env`
- **Docker:** Services communicate through Docker network

Test the connection by visiting the home page - it will show the backend status.

## 🗄️ Database

PostgreSQL is configured in Docker Compose. Connection details:
- **Host:** localhost (or `postgres` in Docker network)
- **Port:** 5432
- **Database:** ai_saas_db
- **User/Password:** Configured in `.env`

## 🔐 Authentication & Payments

Pre-configured for:
- **Clerk** - Authentication
- **Stripe** - Payment processing
- **OpenAI** - AI capabilities

Add your API keys to `.env` file.

## 📝 Next Steps

1. ✅ Project scaffolding complete
2. 🔄 Add authentication with Clerk
3. 🔄 Implement AI features with OpenAI
4. 🔄 Add payment processing with Stripe
5. 🔄 Build your database models
6. 🔄 Create your business logic

## 📚 Documentation

- [Next.js Documentation](https://nextjs.org/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## 🤝 Contributing

This is a starter template. Customize it to fit your needs!

## 📄 License

MIT License - feel free to use this template for your projects.
