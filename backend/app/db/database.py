# backend/app/db/database.py

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import get_settings

settings = get_settings()

# Synchronous engine — we use sync SQLAlchemy for simplicity
# AsyncPG is overkill for a 649-student dataset
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,     # drops stale connections automatically
    pool_size=5,            # max 5 persistent connections
    max_overflow=10         # 10 extra connections under load
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


def get_db():
    """
    FastAPI dependency — yields a DB session per request,
    guarantees session is closed even if the request fails.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()