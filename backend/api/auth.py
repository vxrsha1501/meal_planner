from datetime import datetime, timedelta, timezone

from fastapi import Cookie, Depends, HTTPException, status
from jose import JWTError, jwt
from werkzeug.security import check_password_hash, generate_password_hash

from .db import get_supabase
from .settings import settings


class AuthError(HTTPException):
    def __init__(self, detail: str = "Not authenticated") -> None:
        super().__init__(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)


def hash_password(password: str) -> str:
    return generate_password_hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return check_password_hash(password_hash, password)


def create_access_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)


async def get_current_user(
    token: str | None = Cookie(default=None, alias=settings.cookie_name),
    supabase=Depends(get_supabase),
) -> dict:
    if not token:
        raise AuthError()

    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.jwt_algorithm])
        user_id = int(payload.get("sub"))
    except (JWTError, ValueError, TypeError):
        raise AuthError("Invalid token")

    result = supabase.table("users_auth").select("*").eq("id", user_id).limit(1).execute()
    if not result.data:
        raise AuthError("User not found")

    return result.data[0]
