# Database Setup Guide

## Prerequisites

Before running migrations, ensure PostgreSQL is running. You have two options:

### Option 1: Using Docker Compose (Recommended)

```bash
# Start just the database service
docker-compose up postgres -d

# Or start all services
docker-compose up -d
```

### Option 2: Local PostgreSQL Installation

Make sure PostgreSQL is installed and running on your system with the following credentials:
- User: `postgres`
- Password: `postgres`
- Database: `ai_saas_db`
- Port: `5432`

## Running Migrations

Once PostgreSQL is running:

```bash
# Navigate to backend directory
cd backend

# Activate virtual environment
.\venv\Scripts\Activate.ps1  # Windows
# or
source venv/bin/activate  # Mac/Linux

# Create initial migration (if not already created)
alembic revision --autogenerate -m "Initial database schema"

# Apply migrations
alembic upgrade head
```

## Checking Migration Status

```bash
# Show current migration version
alembic current

# Show migration history
alembic history

# Rollback one version
alembic downgrade -1
```

## Database URL Configuration

The database URL is configured in `.env` file:

```
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/ai_saas_db
```

For Docker Compose, the backend service automatically connects to the `postgres` service.
