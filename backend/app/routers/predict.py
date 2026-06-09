# backend/app/routers/predict.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
import json

from app.db.database import get_db
from app.db.models import Student, Prediction
from app.core.security import get_current_user
from app.services.predictor import predictor

router = APIRouter()


# ── Pydantic schemas ──────────────────────────────────────────────
class PredictRequest(BaseModel):
    school    : str
    sex       : str
    age       : int
    address   : str
    famsize   : str
    Pstatus   : str
    Medu      : int
    Fedu      : int
    Mjob      : str
    Fjob      : str
    reason    : str
    guardian  : str
    studytime : int
    failures  : int
    schoolsup : str
    famsup    : str
    paid      : str
    activities: str
    nursery   : str
    higher    : str
    internet  : str
    romantic  : str
    goout     : int
    Dalc      : int
    Walc      : int
    absences  : int
    G1        : float
    G2        : float


class PredictResponse(BaseModel):
    risk_probability: float
    risk_percent    : float
    predicted_label : int
    risk_level      : str


class BatchPredictRequest(BaseModel):
    student_ids: List[int]


class BatchPredictResponse(BaseModel):
    student_id      : Optional[int]
    risk_probability: float
    risk_percent    : float
    predicted_label : int
    risk_level      : str


# ── Routes ────────────────────────────────────────────────────────
@router.post("/", response_model=PredictResponse)
def predict_single(
    body        : PredictRequest,
    current_user: dict    = Depends(get_current_user),
    db          : Session = Depends(get_db)
):
    """
    Run prediction on raw student feature input.
    Does not require student to exist in DB.
    Useful for quick what-if scenarios.
    """
    result = predictor.predict(body.model_dump())
    return result


@router.post("/student/{student_id}",
             response_model=PredictResponse)
def predict_for_student(
    student_id  : int,
    current_user: dict    = Depends(get_current_user),
    db          : Session = Depends(get_db)
):
    """
    Run prediction for an existing student in DB.
    Saves prediction result to predictions table for history tracking.
    """
    student = db.query(Student).filter(
        Student.id == student_id
    ).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Build feature dict from student record
    feature_fields = [
        "school", "sex", "age", "address", "famsize", "Pstatus",
        "Medu", "Fedu", "Mjob", "Fjob", "reason", "guardian",
        "studytime", "failures", "schoolsup", "famsup", "paid",
        "activities", "nursery", "higher", "internet", "romantic",
        "goout", "Dalc", "Walc", "absences", "G1", "G2"
    ]
    raw = {field: getattr(student, field) for field in feature_fields}

    result = predictor.predict(raw)

    # Copy interventions from previous prediction if exists
    prev_prediction = db.query(Prediction).filter(
        Prediction.student_id == student_id
    ).order_by(Prediction.created_at.desc()).first()

    prev_interventions = None
    if prev_prediction and prev_prediction.shap_protectors:
        try:
            data = json.loads(prev_prediction.shap_protectors)
            if "interventions_applied" in data:
                prev_interventions = prev_prediction.shap_protectors
        except Exception:
            pass


    # Save prediction to DB for history tracking
    prediction = Prediction(
        student_id       = student_id,
        risk_probability = result["risk_probability"],
        risk_percent     = result["risk_percent"],
        predicted_label  = result["predicted_label"],
        model_used       = "xgboost",
        shap_protectors  = prev_interventions,
        created_by       = int(current_user["sub"])
    )
    db.add(prediction)
    db.commit()

    return result


@router.post("/batch", response_model=List[BatchPredictResponse])
def predict_batch(
    body        : BatchPredictRequest,
    current_user: dict    = Depends(get_current_user),
    db          : Session = Depends(get_db)
):
    """
    Run predictions for multiple students at once.
    HOD use case — score entire cohort in one call.
    """
    feature_fields = [
        "school", "sex", "age", "address", "famsize", "Pstatus",
        "Medu", "Fedu", "Mjob", "Fjob", "reason", "guardian",
        "studytime", "failures", "schoolsup", "famsup", "paid",
        "activities", "nursery", "higher", "internet", "romantic",
        "goout", "Dalc", "Walc", "absences", "G1", "G2"
    ]

    records = []
    for sid in body.student_ids:
        student = db.query(Student).filter(Student.id == sid).first()
        if not student:
            continue
        raw = {field: getattr(student, field) for field in feature_fields}
        raw["student_id"] = sid
        records.append(raw)

    if not records:
        raise HTTPException(status_code=404,
                            detail="No valid students found")

    results = predictor.predict_batch(records)

    # Save all predictions to DB, preserving existing interventions
    for result in results:
        # Get previous prediction to copy interventions
        prev = db.query(Prediction).filter(
            Prediction.student_id == result["student_id"]
        ).order_by(Prediction.created_at.desc()).first()

        prev_interventions = None
        if prev and prev.shap_protectors:
            try:
                data = json.loads(prev.shap_protectors)
                if "interventions_applied" in data:
                    prev_interventions = prev.shap_protectors
            except Exception:
                pass

        prediction = Prediction(
            student_id       = result["student_id"],
            risk_probability = result["risk_probability"],
            risk_percent     = result["risk_percent"],
            predicted_label  = result["predicted_label"],
            model_used       = "xgboost",
            shap_protectors  = prev_interventions,
            created_by       = int(current_user["sub"])
        )
        db.add(prediction)
    db.commit()

    return results


@router.get("/history/{student_id}")
def get_prediction_history(
    student_id  : int,
    current_user: dict    = Depends(get_current_user),
    db          : Session = Depends(get_db)
):
    """
    Returns all past predictions for a student.
    Powers the risk trend chart on the student profile page.
    """
    student = db.query(Student).filter(
        Student.id == student_id
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    predictions = db.query(Prediction).filter(
        Prediction.student_id == student_id
    ).order_by(Prediction.created_at.asc()).all()

    return [
        {
            "id"              : p.id,
            "risk_probability": p.risk_probability,
            "risk_percent"    : p.risk_percent,
            "predicted_label" : p.predicted_label,
            "risk_level"      : (
                "Low"    if p.risk_probability < 0.35 else
                "Medium" if p.risk_probability < 0.65 else
                "High"
            ),
            "model_used"      : p.model_used,
            "created_at"      : p.created_at
        }
        for p in predictions
    ]