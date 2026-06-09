# backend/app/routers/students.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List

from app.db.database import get_db
from app.db.models import Student, User
from app.core.security import get_current_user, require_role

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from app.db.models import Prediction
import json
from datetime import datetime, timezone

import csv
import io
from fastapi import UploadFile, File

router = APIRouter()


# ── Pydantic schemas ──────────────────────────────────────────────
class StudentCreate(BaseModel):
    name        : str
    roll_number : str
    school      : str
    sex         : str
    age         : int
    address     : str
    famsize     : str
    Pstatus     : str
    Medu        : int
    Fedu        : int
    Mjob        : str
    Fjob        : str
    reason      : str
    guardian    : str
    studytime   : int
    failures    : int
    schoolsup   : str
    famsup      : str
    paid        : str
    activities  : str
    nursery     : str
    higher      : str
    internet    : str
    romantic    : str
    goout       : int
    Dalc        : int
    Walc        : int
    absences    : int
    G1          : float
    G2          : float
    faculty_id  : Optional[int] = None


class StudentResponse(BaseModel):
    id          : int
    name        : str
    roll_number : str
    school      : str
    sex         : str
    age         : int
    address     : str
    famsize     : str
    Pstatus     : str
    Medu        : int
    Fedu        : int
    Mjob        : str
    Fjob        : str
    reason      : str
    guardian    : str
    studytime   : int
    failures    : int
    schoolsup   : str
    famsup      : str
    paid        : str
    activities  : str
    nursery     : str
    higher      : str
    internet    : str
    romantic    : str
    goout       : int
    Dalc        : int
    Walc        : int
    absences    : int
    G1          : float
    G2          : float
    faculty_id  : Optional[int]

    class Config:
        from_attributes = True


# ── Routes ────────────────────────────────────────────────────────
@router.post("/{student_id}/interventions")
def save_interventions(
    student_id  : int,
    body        : dict,
    current_user: dict    = Depends(get_current_user),
    db          : Session = Depends(get_db)
):
    """
    Saves applied interventions for a student.
    Stores as JSON in the latest prediction record.
    """
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Get latest prediction
    latest = db.query(Prediction).filter(
        Prediction.student_id == student_id
    ).order_by(Prediction.created_at.desc()).first()

    if not latest:
        raise HTTPException(
            status_code=404,
            detail="No prediction found — run risk assessment first"
        )

    # Save interventions list to shap_top_risk field (reusing existing column)
    latest.shap_protectors = json.dumps({
        "interventions_applied": body.get("interventions", []),
        "applied_by"           : current_user["name"],
        "applied_at"           : datetime.now(timezone.utc).isoformat()
    })
    db.commit()

    return {"status": "saved", "interventions": body.get("interventions", [])}


@router.get("/{student_id}/interventions")
def get_interventions(
    student_id  : int,
    current_user: dict    = Depends(get_current_user),
    db          : Session = Depends(get_db)
):
    """Returns previously saved interventions for a student."""
    latest = db.query(Prediction).filter(
        Prediction.student_id == student_id
    ).order_by(Prediction.created_at.desc()).first()

    if not latest or not latest.shap_protectors:
        return {"interventions_applied": [], "applied_by": None, "applied_at": None}

    try:
        data = json.loads(latest.shap_protectors)
        if "interventions_applied" in data:
            return data
        return {"interventions_applied": [], "applied_by": None, "applied_at": None}
    except Exception:
        return {"interventions_applied": [], "applied_by": None, "applied_at": None}
    


@router.get("/", response_model=List[StudentResponse])
def get_all_students(
    skip           : int  = 0,
    limit          : int  = 100,
    current_user   : dict = Depends(get_current_user),
    db             : Session = Depends(get_db)
):
    """
    HOD sees all students.
    Faculty sees only their assigned students.
    """
    if current_user["role"] == "HOD":
        students = db.query(Student).offset(skip).limit(limit).all()
    else:
        faculty_id = int(current_user["sub"])
        students   = db.query(Student).filter(
            Student.faculty_id == faculty_id
        ).offset(skip).limit(limit).all()
    return students


@router.get("/{student_id}", response_model=StudentResponse)
def get_student(
    student_id  : int,
    current_user: dict    = Depends(get_current_user),
    db          : Session = Depends(get_db)
):
    """
    Returns a single student.
    Faculty can only access their own assigned students.
    """
    student = db.query(Student).filter(
        Student.id == student_id
    ).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # RBAC check — faculty can only see their own students
    if current_user["role"] == "faculty":
        if student.faculty_id != int(current_user["sub"]):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
    return student

@router.put("/{student_id}", response_model=StudentResponse)
def update_student(
    student_id  : int,
    body        : StudentCreate,
    current_user: dict    = Depends(get_current_user),
    db          : Session = Depends(get_db)
):
    """
    Updates an existing student record.
    Faculty can only update their own assigned students.
    """
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # RBAC check
    if current_user["role"] == "faculty":
        if student.faculty_id != int(current_user["sub"]):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )

    # Update all fields
    for field, value in body.model_dump().items():
        setattr(student, field, value)

    db.commit()
    db.refresh(student)
    return student

@router.post("/", response_model=StudentResponse,
             status_code=status.HTTP_201_CREATED)
def create_student(
    body        : StudentCreate,
    current_user: dict    = Depends(get_current_user),
    db          : Session = Depends(get_db)
):
    """
    Creates a new student record.
    Available to both faculty and HOD.
    """
    existing = db.query(Student).filter(
        Student.roll_number == body.roll_number
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Roll number already exists"
        )

    data = body.model_dump()
    # Auto-assign faculty_id if creator is faculty
    if current_user["role"] == "faculty":
        data["faculty_id"] = int(current_user["sub"])
    student = Student(**data)
    db.add(student)
    db.commit()
    db.refresh(student)
    return student


@router.delete("/{student_id}",
               status_code=status.HTTP_204_NO_CONTENT)
def delete_student(
    student_id  : int,
    current_user: dict    = Depends(require_role("HOD")),
    db          : Session = Depends(get_db)
):
    """
    Deletes a student. HOD only.
    """
    student = db.query(Student).filter(
        Student.id == student_id
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    db.delete(student)
    db.commit()


@router.post("/bulk-upload")
async def bulk_upload_students(
    file        : UploadFile = File(...),
    current_user: dict       = Depends(get_current_user),
    db          : Session    = Depends(get_db)
):
    """
    Bulk upload students from a CSV file.
    CSV must have headers matching student field names.
    Faculty uploads are auto-assigned to their account.
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")

    contents = await file.read()
    decoded  = contents.decode('utf-8')
    reader   = csv.DictReader(io.StringIO(decoded))

    added    = []
    skipped  = []
    errors   = []

    for row in reader:
        try:
            # Check for duplicate roll number
            existing = db.query(Student).filter(
                Student.roll_number == row.get('roll_number', '').strip()
            ).first()

            if existing:
                skipped.append(row.get('roll_number', 'unknown'))
                continue

            # Build student data
            faculty_id = int(current_user["sub"]) \
                if current_user["role"] == "faculty" else None

            student = Student(
                name        = row['name'].strip(),
                roll_number = row['roll_number'].strip(),
                school      = row.get('school', 'GP').strip(),
                sex         = row.get('sex', 'M').strip(),
                age         = int(row.get('age', 17)),
                address     = row.get('address', 'U').strip(),
                famsize     = row.get('famsize', 'GT3').strip(),
                Pstatus     = row.get('Pstatus', 'T').strip(),
                Medu        = int(row.get('Medu', 2)),
                Fedu        = int(row.get('Fedu', 2)),
                Mjob        = row.get('Mjob', 'other').strip(),
                Fjob        = row.get('Fjob', 'other').strip(),
                reason      = row.get('reason', 'course').strip(),
                guardian    = row.get('guardian', 'mother').strip(),
                studytime   = int(row.get('studytime', 2)),
                failures    = int(row.get('failures', 0)),
                schoolsup   = row.get('schoolsup', 'no').strip(),
                famsup      = row.get('famsup', 'yes').strip(),
                paid        = row.get('paid', 'no').strip(),
                activities  = row.get('activities', 'no').strip(),
                nursery     = row.get('nursery', 'yes').strip(),
                higher      = row.get('higher', 'yes').strip(),
                internet    = row.get('internet', 'yes').strip(),
                romantic    = row.get('romantic', 'no').strip(),
                goout       = int(row.get('goout', 3)),
                Dalc        = int(row.get('Dalc', 1)),
                Walc        = int(row.get('Walc', 1)),
                absences    = int(row.get('absences', 0)),
                G1          = float(row.get('G1', 10)),
                G2          = float(row.get('G2', 10)),
                faculty_id  = faculty_id
            )
            db.add(student)
            added.append(row.get('roll_number', 'unknown'))

        except Exception as e:
            errors.append({
                "roll_number": row.get('roll_number', 'unknown'),
                "error"      : str(e)
            })

    db.commit()

    return {
        "added"  : len(added),
        "skipped": len(skipped),
        "errors" : len(errors),
        "details": {
            "added_rolls"  : added,
            "skipped_rolls": skipped,
            "error_details": errors
        }
    }
