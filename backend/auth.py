import jwt
import bcrypt
from datetime import datetime, timezone, timedelta
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, List
from config import settings
from db import db

security = HTTPBearer(auto_error=False)

STAFF_ROLES = {"Owner", "Manager", "Support", "Fulfillment"}
ADMIN_WRITE_ROLES = {"Owner", "Manager"}


def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_pw(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def make_tokens(user_id: str, role: str) -> dict:
    now = datetime.now(timezone.utc)
    access = jwt.encode(
        {"sub": user_id, "role": role, "exp": now + timedelta(minutes=settings.ACCESS_TOKEN_MIN), "type": "access"},
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALG,
    )
    refresh = jwt.encode(
        {"sub": user_id, "exp": now + timedelta(days=settings.REFRESH_TOKEN_DAYS), "type": "refresh"},
        settings.JWT_REFRESH_SECRET,
        algorithm=settings.JWT_ALG,
    )
    return {"access_token": access, "refresh_token": refresh, "token_type": "bearer"}


def decode_token(token: str, refresh: bool = False) -> dict:
    secret = settings.JWT_REFRESH_SECRET if refresh else settings.JWT_SECRET
    try:
        return jwt.decode(token, secret, algorithms=[settings.JWT_ALG])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_current_user(creds: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    if not creds:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(creds.credentials)
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


async def optional_user(creds: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    if not creds:
        return None
    try:
        payload = decode_token(creds.credentials)
        return await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    except HTTPException:
        return None


def require_roles(roles: List[str]):
    async def _dep(user=Depends(get_current_user)):
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return _dep


require_staff = require_roles(list(STAFF_ROLES))
require_admin_write = require_roles(list(ADMIN_WRITE_ROLES))
