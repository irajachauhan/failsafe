# FAILSAFE — Early Intervention Student Risk Prediction System

A full-stack ML-powered system that predicts at-risk students early using behavioral and academic data, explains predictions using SHAP, and auto-generates personalized intervention recommendations for faculty and HODs.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| ML Pipeline | Python, XGBoost, Random Forest, SHAP, scikit-learn |
| Backend API | FastAPI, PostgreSQL, SQLAlchemy, JWT Auth |
| Frontend | React.js, Tailwind CSS, Recharts |

---

## Project Structure
FailSafe/
├── backend/
│   ├── app/
│   │   ├── core/          # JWT auth, config, security
│   │   ├── db/            # SQLAlchemy models, database setup
│   │   ├── routers/       # API endpoints (auth, students, predict, explain)
│   │   └── services/      # ML predictor, SHAP formatter
│   ├── ml/
│   │   ├── notebooks/     # Jupyter notebooks for ML pipeline
│   │   │   ├── preprocess.ipynb
│   │   │   ├── train.ipynb
│   │   │   └── explain.ipynb
│   │   ├── data/          # CSV files (not committed — see below)
│   │   └── models/        # Trained model artifacts (not committed — see below)
│   └── requirements.txt
└── frontend/
└── src/
├── context/       # Auth context
└── pages/         # Dashboard, Profile, HOD Analytics, etc.

---

## Features

- **Risk Prediction** — XGBoost model (AUC 0.922, F1 0.71) trained on student behavioral + academic data
- **SHAP Explanations** — Per-student waterfall chart showing why each student is flagged
- **Intervention Generator** — SHAP-driven personalized recommendations per student
- **Intervention Tracking** — Faculty can mark interventions as applied
- **Risk Trend Chart** — Visual risk trajectory over semester
- **HOD Analytics** — Cohort-level feature importance dashboard
- **Bulk CSV Upload** — Add multiple students at once
- **Export At-Risk CSV** — One-click export of flagged students
- **RBAC** — Separate HOD and Faculty access levels

---

## Setup Instructions

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 17+
- Anaconda (recommended)

### 1. Clone the repository
```bash
git clone https://github.com/YOURUSERNAME/failsafe.git
cd failsafe
```

### 2. Set up Python environment
```bash
conda create -n studentrisk python=3.11
conda activate studentrisk
pip install -r backend/requirements.txt
```

### 3. Set up PostgreSQL
```sql
CREATE DATABASE failsafe;
CREATE USER failsafe_user WITH PASSWORD 'failsafe123';
GRANT ALL PRIVILEGES ON DATABASE failsafe TO failsafe_user;
GRANT ALL ON SCHEMA public TO failsafe_user;
ALTER DATABASE failsafe OWNER TO failsafe_user;
```

### 4. Create `.env` file
Create `backend/.env`:
DATABASE_URL=postgresql://failsafe_user:failsafe123@localhost:5432/failsafe
SECRET_KEY=failsafe_super_secret_key_change_in_production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
APP_NAME=FAILSAFE
DEBUG=True

### 5. Set up data files
Place the following CSVs in `backend/ml/data/`:
- `student-mat.csv`
- `student-por.csv`

Dataset source: [UCI ML Repository — Student Performance](https://archive.ics.uci.edu/dataset/320/student+performance)

### 6. Generate ML models
Open Jupyter and run notebooks **in order**:
backend/ml/notebooks/preprocess.ipynb  → EDA, preprocessing, train/test split
backend/ml/notebooks/train.ipynb       → Model training and evaluation
backend/ml/notebooks/explain.ipynb     → SHAP values and formatter

This will generate all model artifacts in `backend/ml/models/`.

### 7. Initialize database
```bash
cd backend
python -m app.db.init_db
```

### 8. Start backend
```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

### 9. Start frontend
```bash
cd frontend
npm install
npm start
```

### 10. Open the app
http://localhost:3000

Default credentials:
HOD      → hod@failsafe.com     / hod123
Faculty  → faculty@failsafe.com / faculty123

---

## Model Performance

| Metric | Random Forest | XGBoost (Primary) |
|--------|--------------|-------------------|
| Accuracy | 0.862 | 0.900 |
| At-Risk F1 | 0.65 | **0.71** |
| ROC-AUC | 0.939 | **0.922** |
| False Positives | 15 | **9** |

XGBoost selected as primary model — higher precision means fewer false alarms, preserving faculty trust.

---

## API Documentation

FastAPI auto-generates interactive docs at:
http://localhost:8000/docs

---

## Dataset

UCI ML Repository — Student Performance Dataset  
395 Math + 649 Portuguese students  
33 features including grades, demographics, and behavioral indicators  
Target: Binary risk classification (G3 < 10 = at-risk)

