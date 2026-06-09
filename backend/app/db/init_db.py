# backend/app/db/init_db.py

from app.db.database import engine, Base
from app.db.models import User, Student, Prediction
from app.core.security import hash_password
from sqlalchemy.orm import Session


def create_tables():
    """
    Creates all tables defined in models.py.
    Safe to run multiple times — won't drop existing tables.
    """
    Base.metadata.create_all(bind=engine)
    print("Tables created ✓")


def seed_default_users():
    """
    Creates default HOD and Faculty accounts for first run.
    Change these passwords immediately in production.
    """
    db = Session(bind=engine)

    # Check if already seeded
    existing = db.query(User).first()
    if existing:
        print("Users already seeded ✓")
        db.close()
        return

    users = [
        User(
            full_name = "Dr. Sharma",
            email     = "hod@failsafe.com",
            password  = hash_password("hod123"),
            role      = "HOD"
        ),
        User(
            full_name = "Prof. Verma",
            email     = "faculty@failsafe.com",
            password  = hash_password("faculty123"),
            role      = "faculty"
        )
    ]

    db.add_all(users)
    db.commit()
    print(f"Seeded {len(users)} default users ✓")
    print("  HOD      → hod@failsafe.com     / hod123")
    print("  Faculty  → faculty@failsafe.com / faculty123")
    db.close()


if __name__ == "__main__":
    create_tables()
    seed_default_users()