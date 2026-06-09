# backend/app/core/security.py

from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from app.core.config import get_settings

settings = OAuth2PasswordBearer(tokenUrl="/auth/login")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


# ── Password utils ────────────────────────────────────────────────
def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


# ── JWT utils ─────────────────────────────────────────────────────
def create_access_token(data: dict,
                         expires_delta: Optional[timedelta] = None) -> str:
    """
    Creates a short-lived access token (default 30 min).
    Embeds user_id and role in the payload so every
    protected endpoint can check permissions without a DB hit.
    """
    cfg     = get_settings()
    payload = data.copy()
    expire  = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=cfg.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    payload.update({"exp": expire, "type": "access"})
    return jwt.encode(payload, cfg.SECRET_KEY, algorithm=cfg.ALGORITHM)


def create_refresh_token(data: dict) -> str:
    """
    Long-lived refresh token (default 7 days).
    Used only to issue new access tokens — never for data access.
    """
    cfg     = get_settings()
    payload = data.copy()
    expire  = datetime.now(timezone.utc) + timedelta(
        days=cfg.REFRESH_TOKEN_EXPIRE_DAYS
    )
    payload.update({"exp": expire, "type": "refresh"})
    return jwt.encode(payload, cfg.SECRET_KEY, algorithm=cfg.ALGORITHM)


def decode_token(token: str) -> dict:
    """
    Decodes and validates a JWT.
    Raises 401 if expired or tampered.
    """
    cfg = get_settings()
    try:
        payload = jwt.decode(token, cfg.SECRET_KEY,
                              algorithms=[cfg.ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"}
        )


# ── RBAC dependency ───────────────────────────────────────────────
def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """
    FastAPI dependency — inject into any route that needs auth.
    Returns the decoded token payload containing user_id and role.
    """
    payload = decode_token(token)
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type"
        )
    return payload


def require_role(*roles: str):
    """
    RBAC dependency factory.
    Usage: Depends(require_role("HOD"))
           Depends(require_role("faculty", "HOD"))
    """
    def role_checker(
        current_user: dict = Depends(get_current_user)
    ) -> dict:
        if current_user.get("role") not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access restricted to: {', '.join(roles)}"
            )
        return current_user
    return role_checker