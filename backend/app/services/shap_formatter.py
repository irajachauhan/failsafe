import numpy as np
import json


class NumpyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (np.integer,)):  return int(obj)
        if isinstance(obj, (np.floating,)): return float(obj)
        if isinstance(obj, np.ndarray):     return obj.tolist()
        return super().default(obj)


def get_original_value(col, scaled_val, scaler, scale_cols):
    scale_idx = {c: i for i, c in enumerate(scale_cols)}
    if col in scale_idx:
        idx  = scale_idx[col]
        mean = scaler.mean_[idx]
        std  = scaler.scale_[idx]
        return round(float(scaled_val * std + mean), 2)
    return round(float(scaled_val), 2)


def format_shap_for_api(student_idx, shap_vals, explainer,
                         X_scaled_data, y_true, model,
                         scaler, scale_cols):
    pred_prob  = float(model.predict_proba(X_scaled_data)[student_idx][1])
    pred_label = int(model.predict(X_scaled_data)[student_idx])
    true_label = int(y_true.iloc[student_idx]) if y_true is not None else None

    contributions = []
    for feat, shap_val, scaled_val in zip(
        X_scaled_data.columns,
        shap_vals[student_idx],
        X_scaled_data.iloc[student_idx].values
    ):
        original_val = get_original_value(feat, scaled_val,
                                          scaler, scale_cols)
        contributions.append({
            "feature"      : str(feat),
            "shap_value"   : round(float(shap_val), 4),
            "feature_value": original_val,
            "direction"    : "risk" if shap_val > 0 else "protective"
        })

    contributions.sort(key=lambda x: abs(x["shap_value"]), reverse=True)

    return {
        "student_index"   : student_idx,
        "true_label"      : true_label,
        "predicted_label" : pred_label,
        "risk_probability": round(pred_prob, 4),
        "risk_percent"    : round(pred_prob * 100, 1),
        "baseline_value"  : round(float(explainer.expected_value), 4),
        "top_risk_factors": [c for c in contributions
                              if c["direction"] == "risk"][:5],
        "top_protectors"  : [c for c in contributions
                              if c["direction"] == "protective"][:5],
        "all_contributions": contributions
    }
