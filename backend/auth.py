import os
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from database import get_db
from models import User

SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me-in-production-please-x")
ALGO = "HS256"
TOKEN_HOURS = 12

# auto_error=False: do NOT raise 403 when Authorization header is absent.
# This prevents OPTIONS preflight requests (which have no auth header) from
# being rejected before the CORS middleware can attach its response headers.
bearer = HTTPBearer(auto_error=False)


def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_pw(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except ValueError:
        return False


def create_token(user_id: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=TOKEN_HOURS),
    }
    return jwt.encode(payload, SECRET, algorithm=ALGO)


def get_curr_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    # When auto_error=False, creds is None if the Authorization header is missing.
    # This happens during CORS preflight (OPTIONS). Raise 401 manually so the
    # CORS middleware still gets a chance to add its headers to the response.
    if creds is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    try:
        payload = jwt.decode(creds.credentials, SECRET, algorithms=[ALGO])
        user_id = payload.get("sub")
    except jwt.PyJWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")
    return user


def require_role(allowed_roles: list[str]):
    def checker(user: User = Depends(get_curr_user)) -> User:
        if user.role.value not in allowed_roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Not allowed for your role")
        return user
    return checker
