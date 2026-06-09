# backend/app/services/predictor.py

import joblib
import numpy as np
import pandas as pd
import os
from app.core.config import get_settings

settings = get_settings()


class Predictor:
    """
    Loads all ML artifacts once at startup and reuses them.
    Singleton pattern — instantiated once in predict.py router.
    """

    def __init__(self):
        models_dir = os.path.normpath(settings.MODELS_DIR)

        self.model    = joblib.load(os.path.join(models_dir, "xgb_model.pkl"))
        self.scaler   = joblib.load(os.path.join(models_dir, "scaler.pkl"))
        self.encoders = joblib.load(os.path.join(models_dir, "encoders.pkl"))
        self.metadata = joblib.load(os.path.join(models_dir, "metadata.pkl"))

        self.feature_cols = self.metadata["feature_cols"]
        self.scale_cols   = self.metadata["scale_cols"]
        self.binary_cols  = self.metadata["binary_cols"]
        self.nominal_cols = self.metadata["nominal_cols"]

        print(f"[Predictor] Model loaded ✓  |  "
              f"Features: {len(self.feature_cols)}")

    def preprocess(self, raw: dict) -> pd.DataFrame:
        """
        Applies the exact same pipeline used during training:
        1. Encode categorical columns using saved LabelEncoders
        2. Scale continuous columns using saved StandardScaler
        3. Return DataFrame in correct feature order
        """
        df = pd.DataFrame([raw])

        # Cap absences at training cap value (12)
        if "absences" in df.columns:
            df["absences"] = df["absences"].clip(upper=12)

        # Encode categorical columns
        for col, le in self.encoders.items():
            if col in df.columns:
                val = df[col].astype(str).iloc[0]
                # Handle unseen categories gracefully
                if val in le.classes_:
                    df[col] = le.transform([val])
                else:
                    df[col] = 0

        # Drop columns not used in training
        drop_cols = self.metadata["drop_cols"]
        df = df.drop(columns=drop_cols, errors="ignore")

        # Ensure correct column order
        df = df[self.feature_cols]

        # Scale continuous columns
        df[self.scale_cols] = self.scaler.transform(df[self.scale_cols])

        return df

    def predict(self, raw: dict) -> dict:
        """
        Full inference pipeline for a single student.
        Returns risk probability, label, and risk level string.
        """
        X = self.preprocess(raw)

        prob  = float(self.model.predict_proba(X)[0][1])
        label = int(self.model.predict(X)[0])

        # Map probability to risk level string for UI display
        if prob < 0.35:
            risk_level = "Low"
        elif prob < 0.65:
            risk_level = "Medium"
        else:
            risk_level = "High"

        return {
            "risk_probability": round(prob, 4),
            "risk_percent"    : round(prob * 100, 1),
            "predicted_label" : label,
            "risk_level"      : risk_level
        }

    def predict_batch(self, records: list[dict]) -> list[dict]:
        """
        Runs inference on multiple students at once.
        More efficient than calling predict() in a loop.
        """
        results = []
        for record in records:
            result = self.predict(record)
            result["student_id"] = record.get("student_id")
            results.append(result)
        return results


# Singleton instance — imported by the router
predictor = Predictor()