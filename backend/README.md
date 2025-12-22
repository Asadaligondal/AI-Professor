# Backend - FastAPI

## Setup

### Create Virtual Environment

```bash
python -m venv venv
```

### Activate Virtual Environment

Windows:
```bash
venv\Scripts\activate
```

Mac/Linux:
```bash
source venv/bin/activate
```

### Install Dependencies

```bash
pip install -r requirements.txt
```

### Run Development Server

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

API will be available at: http://localhost:8000

API documentation: http://localhost:8000/docs
