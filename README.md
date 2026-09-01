# FAILSAFE — Early Intervention Student Risk Prediction System

> An explainable machine learning system for identifying academically at-risk students and helping educators understand the factors behind each prediction.

## 📌 About the Project

Students who are struggling academically are often identified only after their performance has already declined significantly. FAILSAFE was built around a simple idea:

**Can we identify students who may be at risk early enough for meaningful intervention?**

FAILSAFE uses academic and behavioral information to estimate a student's risk of poor final performance. Instead of stopping at a prediction, the system also explains **why a student was flagged** and provides intervention suggestions based on the identified risk factors.

The project combines:

- Machine learning for student-risk prediction
- SHAP for model explainability
- Personalized intervention recommendations
- Historical risk tracking
- A web dashboard for faculty and HODs

### Core Workflow

**Student Data → Risk Prediction → Explanation → Intervention → Tracking**

---

## 🎯 Problem Definition

The project formulates student-risk prediction as a binary classification problem.

A student is considered **At-Risk** when:

```text
G3 < 10
```

where `G3` represents the student's final grade.

Otherwise, the student is classified as **Not At-Risk**.

The model uses academic, behavioral, demographic, and social attributes to predict the likelihood of a student falling into the at-risk category.

> **Important:** Since `G1` and `G2` are used as predictive features, the current system is an early-warning system after earlier academic assessments rather than a prediction system before any grades are available.

---

## 📊 Dataset

The project uses the **Student Performance Dataset** from the UCI Machine Learning Repository.

The dataset contains student information from mathematics and Portuguese courses, including academic performance along with demographic, social, and behavioral characteristics.

### Dataset Characteristics

- 649 students in the Portuguese dataset
- 395 students in the mathematics dataset
- 33 original attributes
- Academic, demographic, social, and behavioral features
- Final grade (`G3`) used to derive the binary risk label

### Important Features

| Feature | Description |
|---|---|
| `G1` | First-period grade |
| `G2` | Second-period grade |
| `failures` | Number of previous failures |
| `absences` | Number of school absences |
| `studytime` | Weekly study time |
| `goout` | Social activity |
| `Dalc` | Workday alcohol consumption |
| `Walc` | Weekend alcohol consumption |
| `Medu` | Mother's education |
| `Fedu` | Father's education |

Dataset: [UCI Student Performance Dataset](https://archive.ics.uci.edu/dataset/320/student+performance)

---

## 🧠 Machine Learning Approach

The raw student records are transformed into a format suitable for machine learning.

### Preprocessing

The preprocessing pipeline includes:

- Data cleaning
- Categorical feature encoding
- Numerical feature scaling
- Feature selection
- Stratified train/test splitting

The target is derived from the final grade:

```text
G3 < 10  →  At-Risk
G3 >= 10 →  Not At-Risk
```

### Models Evaluated

Two tree-based machine learning models were explored:

- Random Forest
- XGBoost

XGBoost was selected as the primary model because it achieved a stronger F1 score for the at-risk class and produced fewer false-positive predictions.

---

## 📈 Model Performance

| Model | Accuracy | At-Risk F1 | ROC-AUC |
|---|---:|---:|---:|
| Random Forest | 86.2% | 0.65 | **0.939** |
| XGBoost | **90.0%** | **0.71** | 0.922 |

### Final XGBoost Results

- **Accuracy:** 90.0%
- **At-Risk F1:** 0.71
- **ROC-AUC:** 0.922
- **False Positives:** 9

Accuracy is not considered in isolation because the dataset contains fewer at-risk students than non-at-risk students. The **At-Risk F1 score** is particularly important because the main objective is to identify students who may require intervention.

---

## 🔍 Explainable AI with SHAP

A prediction alone is not sufficient in an educational setting. Faculty need to understand the reasoning behind a model's decision.

FAILSAFE uses **SHAP (SHapley Additive exPlanations)** to identify the features that contribute to an individual prediction.

Instead of displaying only:

```text
Risk Level: HIGH
Risk Probability: 82%
```

the system can provide:

```text
Risk Factors
├── Previous failures
├── High absenteeism
└── Low academic performance

Protective Factors
├── Higher study time
└── Positive behavioral indicators
```

This makes the prediction more interpretable and helps connect the model's output to possible interventions.

---

## 💡 Personalized Intervention

FAILSAFE goes beyond identifying at-risk students.

The system uses the factors identified through SHAP to generate intervention suggestions targeted toward the student's situation.

For example:

```text
Low academic performance
        +
High absenteeism
        ↓
Academic support
        +
Attendance intervention
```

This creates the project's main decision-support cycle:

**Predict → Explain → Intervene → Monitor**

---

### Machine Learning Layer

Responsible for:

- Data preprocessing
- Model training
- Risk prediction
- Probability estimation
- SHAP explanations

### Backend Layer

Built with **FastAPI** and responsible for:

- Authentication
- Student management
- Prediction APIs
- SHAP explanation APIs
- Intervention management
- Database communication

### Frontend Layer

Built with **React.js** and provides:

- Student dashboard
- Risk visualization
- Individual student profiles
- SHAP-based explanations
- Intervention tracking
- Risk trends
- HOD analytics

### Database Layer

**PostgreSQL** is used to persist student information, predictions, explanations, and intervention history.

---

## 👥 Role-Based Access

FAILSAFE supports different application roles.

### Faculty

Faculty users can:

- View students
- Add students
- Upload students in bulk
- Generate risk predictions
- View SHAP explanations
- Apply interventions
- Track student risk

### HOD

HOD users have faculty capabilities along with:

- Cohort-level analytics
- Feature-importance analysis
- Department-level insights

Authentication is handled using **JWT-based authentication** and role-based access control.

---

## 🚧 Challenges Faced

### 1. Imbalanced Target Classes

The dataset contains considerably fewer at-risk students than non-at-risk students.

This means that accuracy alone can give a misleading impression of model performance.

To address this, the project evaluates:

- Precision
- Recall
- F1 score
- ROC-AUC
- False positives

Class weighting was also incorporated into the tree-based models.

### 2. Making Predictions Understandable

A raw prediction such as:

```text
At-Risk = 1
```

does not tell an educator what action should be taken.

The challenge was to connect model predictions with understandable reasons.

SHAP was introduced to identify the individual feature contributions behind each prediction.

### 3. Turning Predictions into Actions

The system was designed to avoid simply telling faculty:

> "This student is at risk."

Instead, the model output is connected with risk factors and intervention recommendations.

This turns the output from a prediction into a potential decision-support tool.

### 4. Integrating ML with a Full-Stack Application

The ML model was only one part of the system.

The project required connecting:

```text
React
  ↓
FastAPI
  ↓
ML Model
  ↓
SHAP
  ↓
PostgreSQL
```

while maintaining authentication, role-based access, prediction history, and student-level information.

---

## ⚠️ Limitations

### Dataset Size

The evaluation is based on a relatively small academic dataset. The reported results should therefore not be interpreted as guaranteed performance on real institutional data.

### Limited At-Risk Samples

The held-out test set contains a small number of at-risk students, making minority-class metrics sensitive to individual predictions.

### Dependence on Previous Grades

Because `G1` and `G2` are predictive features, the current system is intended for early warning after earlier assessments.

### Real-World Generalization

Student behavior can vary across institutions, courses, and educational systems. A model trained on the UCI dataset would require validation and potentially retraining before being used with real institutional data.

---

## 🔮 Future Improvements

- Train on larger and more diverse institutional datasets.
- Use cross-validation for more reliable performance estimates.
- Fit preprocessing transformations only on training data to avoid data leakage.
- Add temporal features to model changes in student performance over time.
- Evaluate the model on completely unseen cohorts or institutions.
- Improve intervention recommendations using feedback from previous interventions.
- Add automated alerts when a student's risk increases significantly.
- Explore advanced ensemble and deep learning approaches.
- Deploy the application using containerized/cloud infrastructure.

---

## 🛠️ Tech Stack

### Machine Learning
`Python` · `Scikit-learn` · `XGBoost` · `SHAP` · `Pandas` · `NumPy`

### Backend
`FastAPI` · `SQLAlchemy` · `PostgreSQL`

### Frontend
`React.js` · `Tailwind CSS` · `Recharts`

### Authentication
`JWT` · `Role-Based Access Control`

---
