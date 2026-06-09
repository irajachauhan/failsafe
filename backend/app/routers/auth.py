# backend/app/routers/auth.py

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from app.db.database import get_db
from app.db.models import User
from app.core.security import (verify_password, hash_password,
                                create_access_token, create_refresh_token,
                                decode_token, get_current_user)

router = APIRouter()


# ── Pydantic schemas (inline for now) ────────────────────────────
class TokenResponse(BaseModel):
    access_token : str
    refresh_token: str
    token_type   : str = "bearer"
    role         : str
    full_name    : str

class RefreshRequest(BaseModel):
    refresh_token: str

class RegisterRequest(BaseModel):
    full_name: str
    email    : EmailStr
    password : str
    role     : str   # "faculty" or "HOD"

class UserResponse(BaseModel):
    id       : int
    full_name: str
    email    : str
    role     : str
    is_active: bool

    class Config:
        from_attributes = True


# ── Routes ────────────────────────────────────────────────────────
@router.post("/login", response_model=TokenResponse)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    Standard OAuth2 login.
    Returns access + refresh tokens with role embedded.
    Frontend stores these in memory (not localStorage).
    """
    user = db.query(User).filter(User.email == form_data.username).first()

    if not user or not verify_password(form_data.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated"
        )

    payload = {
        "sub" : str(user.id),
        "role": user.role,
        "name": user.full_name
    }

    return TokenResponse(
        access_token  = create_access_token(payload),
        refresh_token = create_refresh_token(payload),
        role          = user.role,
        full_name     = user.full_name
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(
    body: RefreshRequest,
    db  : Session = Depends(get_db)
):
    """
    Issues a new access token using a valid refresh token.
    Refresh tokens are long-lived (7 days).
    """
    payload = decode_token(body.refresh_token)

    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )

    user = db.query(User).filter(
        User.id == int(payload["sub"])
    ).first()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )

    new_payload = {
        "sub" : str(user.id),
        "role": user.role,
        "name": user.full_name
    }

    return TokenResponse(
        access_token  = create_access_token(new_payload),
        refresh_token = create_refresh_token(new_payload),
        role          = user.role,
        full_name     = user.full_name
    )


@router.post("/register", response_model=UserResponse)
def register(
    body: RegisterRequest,
    db  : Session = Depends(get_db),
    _   : dict    = Depends(get_current_user)  # must be logged in
):
    """
    Creates a new user. Requires an existing logged-in user.
    In production this should be HOD-only.
    """
    if body.role not in ("faculty", "HOD"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be 'faculty' or 'HOD'"
        )

    existing = db.query(User).filter(User.email == body.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    user = User(
        full_name = body.full_name,
        email     = body.email,
        password  = hash_password(body.password),
        role      = body.role
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/me", response_model=UserResponse)
def get_me(
    current_user: dict    = Depends(get_current_user),
    db          : Session = Depends(get_db)
):
    """Returns the currently logged-in user's profile."""
    user = db.query(User).filter(
        User.id == int(current_user["sub"])
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user