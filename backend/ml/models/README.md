# Model Artifacts

These files are not committed to the repository (excluded via .gitignore).

To regenerate all model artifacts, run the following notebooks in order:

1. `backend/ml/notebooks/preprocess.ipynb` — Data preprocessing, EDA, encoding, scaling, train/test split
2. `backend/ml/notebooks/train.ipynb` — Model training (Random Forest + XGBoost), evaluation, model selection
3. `backend/ml/notebooks/explain.ipynb` — SHAP values, global + per-student explanations, JSON formatter

## Generated Files

| File | Description |
|------|-------------|
| `xgb_model.pkl` | Primary XGBoost model (256 KB) |
| `rf_model.pkl` | Backup Random Forest model (1.1 MB) |
| `scaler.pkl` | StandardScaler fit on training data |
| `encoders.pkl` | LabelEncoders for categorical columns |
| `metadata.pkl` | Column lists, bins, threshold config |
| `shap_explainer.pkl` | SHAP TreeExplainer (728 KB) |
| `shap_values_test.pkl` | SHAP values for test set |
| `feature_cols.pkl` | Feature column order for inference |