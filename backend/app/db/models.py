# backend/app/db/models.py

from sqlalchemy import (Column, Integer, String, Float,
                         Boolean, DateTime, ForeignKey, Text)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base


class User(Base):
    """
    System users — Faculty and HOD roles.
    Faculty can view their own students.
    HOD can view all students + department analytics.
    """
    __tablename__ = "users"

    id         = Column(Integer, primary_key=True, index=True)
    full_name  = Column(String(100), nullable=False)
    email      = Column(String(100), unique=True, index=True, nullable=False)
    password   = Column(String(255), nullable=False)
    role       = Column(String(20), nullable=False)  # "faculty" or "HOD"
    is_active  = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # One user can have many students assigned
    students   = relationship("Student", back_populates="assigned_to")


class Student(Base):
    """
    Core student record — mirrors the dataset features.
    Stores both raw input features and computed risk info.
    """
    __tablename__ = "students"

    id          = Column(Integer, primary_key=True, index=True)
    name        = Column(String(100), nullable=False)
    roll_number = Column(String(50), unique=True, index=True, nullable=False)

    # Assigned faculty
    faculty_id  = Column(Integer, ForeignKey("users.id"), nullable=True)
    assigned_to = relationship("User", back_populates="students")

    # ── Dataset features ──────────────────────────────────────────
    school      = Column(String(5))
    sex         = Column(String(2))
    age         = Column(Integer)
    address     = Column(String(2))
    famsize     = Column(String(5))
    Pstatus     = Column(String(2))
    Medu        = Column(Integer)
    Fedu        = Column(Integer)
    Mjob        = Column(String(20))
    Fjob        = Column(String(20))
    reason      = Column(String(20))
    guardian    = Column(String(10))
    studytime   = Column(Integer)
    failures    = Column(Integer)
    schoolsup   = Column(String(5))
    famsup      = Column(String(5))
    paid        = Column(String(5))
    activities  = Column(String(5))
    nursery     = Column(String(5))
    higher      = Column(String(5))
    internet    = Column(String(5))
    romantic    = Column(String(5))
    goout       = Column(Integer)
    Dalc        = Column(Integer)
    Walc        = Column(Integer)
    absences    = Column(Integer)
    G1          = Column(Float)
    G2          = Column(Float)

    # ── Predictions (updated on each inference) ───────────────────
    predictions = relationship("Prediction",
                                back_populates="student",
                                order_by="Prediction.created_at.desc()")
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    updated_at  = Column(DateTime(timezone=True), onupdate=func.now())


class Prediction(Base):
    """
    Stores every prediction made for a student.
    Keeping history lets us track risk trajectory over time.
    """
    __tablename__ = "predictions"

    id              = Column(Integer, primary_key=True, index=True)
    student_id      = Column(Integer, ForeignKey("students.id"),
                              nullable=False)
    student         = relationship("Student", back_populates="predictions")

    # Model output
    risk_probability = Column(Float, nullable=False)
    risk_percent     = Column(Float, nullable=False)
    predicted_label  = Column(Integer, nullable=False)  # 0 or 1
    model_used       = Column(String(20), default="xgboost")

    # SHAP output stored as JSON string
    shap_top_risk    = Column(Text)   # JSON — top 5 risk factors
    shap_protectors  = Column(Text)   # JSON — top 5 protectors

    created_at       = Column(DateTime(timezone=True),
                               server_default=func.now())
    created_by       = Column(Integer, ForeignKey("users.id"))