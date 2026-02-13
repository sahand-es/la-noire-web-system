# La Noire Web System

## Local Setup

1. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Start PostgreSQL database:
```bash
docker-compose up -d
```

4. Run migrations (from `backend/`):
```bash
cd backend
python manage.py migrate
```

5. Create superuser (optional):
```bash
python manage.py createsuperuser
```

6. Run development server:
```bash
python manage.py runserver
```

The server will be available at `http://127.0.0.1:8000/`

**Project layout:** Backend (Django), including `manage.py`, lives in `backend/`. 

