# backend/app/routers/explain.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import numpy as np
import pandas as pd
import joblib
import os

from app.db.database import get_db
from app.db.models import Student
from app.core.security import get_current_user
from app.services.predictor import predictor
from app.core.config import get_settings

router   = APIRouter()
settings = get_settings()


def get_explainer():
    models_dir = os.path.normpath(settings.MODELS_DIR)
    return joblib.load(os.path.join(models_dir, "shap_explainer.pkl"))


def get_original_value(col, scaled_val, scaler, scale_cols):
    scale_idx = {c: i for i, c in enumerate(scale_cols)}
    if col in scale_idx:
        idx  = scale_idx[col]
        mean = scaler.mean_[idx]
        std  = scaler.scale_[idx]
        return round(float(scaled_val * std + mean), 2)
    return round(float(scaled_val), 2)


def build_shap_output(X_scaled: pd.DataFrame,
                       shap_vals: np.ndarray,
                       explainer,
                       row_idx: int = 0) -> dict:
    """
    Formats SHAP values into the structure React waterfall needs.
    Returns original (unscaled) feature values for faculty readability.
    """
    contributions = []
    for feat, shap_val, scaled_val in zip(
        X_scaled.columns,
        shap_vals[row_idx],
        X_scaled.iloc[row_idx].values
    ):
        original_val = get_original_value(
            feat, scaled_val,
            predictor.scaler,
            predictor.scale_cols
        )
        contributions.append({
            "feature"      : str(feat),
            "shap_value"   : round(float(shap_val), 4),
            "feature_value": original_val,
            "direction"    : "risk" if shap_val > 0 else "protective"
        })

    contributions.sort(key=lambda x: abs(x["shap_value"]), reverse=True)

    return {
        "baseline_value"  : round(float(explainer.expected_value), 4),
        "top_risk_factors": [c for c in contributions
                              if c["direction"] == "risk"][:5],
        "top_protectors"  : [c for c in contributions
                              if c["direction"] == "protective"][:5],
        "all_contributions": contributions
    }


# ── Routes ────────────────────────────────────────────────────────
@router.get("/student/{student_id}")
def explain_student(
    student_id  : int,
    current_user: dict    = Depends(get_current_user),
    db          : Session = Depends(get_db)
):
    """
    Returns SHAP explanation for a single student.
    Powers the 'Why is this student at risk?' waterfall in React.
    """
    student = db.query(Student).filter(
        Student.id == student_id
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    feature_fields = predictor.feature_cols
    raw = {}
    for field in [
        "school", "sex", "age", "address", "famsize", "Pstatus",
        "Medu", "Fedu", "Mjob", "Fjob", "reason", "guardian",
        "studytime", "failures", "schoolsup", "famsup", "paid",
        "activities", "nursery", "higher", "internet", "romantic",
        "goout", "Dalc", "Walc", "absences", "G1", "G2"
    ]:
        raw[field] = getattr(student, field)

    # Preprocess using same pipeline as training
    X_scaled  = predictor.preprocess(raw)
    explainer = get_explainer()
    shap_vals = explainer.shap_values(X_scaled)

    # Get prediction alongside explanation
    pred_prob  = float(predictor.model.predict_proba(X_scaled)[0][1])
    pred_label = int(predictor.model.predict(X_scaled)[0])
    risk_level = (
        "Low"    if pred_prob < 0.35 else
        "Medium" if pred_prob < 0.65 else
        "High"
    )

    shap_output = build_shap_output(X_scaled, shap_vals, explainer)

    return {
        "student_id"      : student_id,
        "student_name"    : student.name,
        "risk_probability": round(pred_prob, 4),
        "risk_percent"    : round(pred_prob * 100, 1),
        "predicted_label" : pred_label,
        "risk_level"      : risk_level,
        **shap_output
    }


@router.get("/cohort")
def explain_cohort(
    current_user: dict    = Depends(get_current_user),
    db          : Session = Depends(get_db)
):
    """
    Returns global SHAP feature importance across all students in DB.
    Powers the HOD analytics dashboard feature importance chart.
    """
    students = db.query(Student).all()
    if not students:
        raise HTTPException(status_code=404,
                            detail="No students in database")

    records = []
    for student in students:
        raw = {}
        for field in [
            "school", "sex", "age", "address", "famsize", "Pstatus",
            "Medu", "Fedu", "Mjob", "Fjob", "reason", "guardian",
            "studytime", "failures", "schoolsup", "famsup", "paid",
            "activities", "nursery", "higher", "internet", "romantic",
            "goout", "Dalc", "Walc", "absences", "G1", "G2"
        ]:
            raw[field] = getattr(student, field)
        records.append(predictor.preprocess(raw))

    X_all     = pd.concat(records, ignore_index=True)
    explainer = get_explainer()
    shap_vals = explainer.shap_values(X_all)

    # Mean absolute SHAP per feature — global importance
    importance = []
    for i, feat in enumerate(X_all.columns):
        importance.append({
            "feature"   : str(feat),
            "importance": round(float(np.abs(shap_vals[:, i]).mean()), 4)
        })

    importance.sort(key=lambda x: x["importance"], reverse=True)

    return {
        "total_students"   : len(students),
        "feature_importance": importance
    }