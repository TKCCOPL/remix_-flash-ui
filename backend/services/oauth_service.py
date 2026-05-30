from datetime import datetime, timedelta, timezone

from jose import jwt, JWTError

from config import GUEST_JWT_SECRET, GUEST_JWT_ALGORITHM, GUEST_TOKEN_EXPIRE_HOURS


def create_guest_token(user_id: int, username: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=GUEST_TOKEN_EXPIRE_HOURS)
    payload = {"user_id": user_id, "username": username, "type": "guest", "exp": expire}
    return jwt.encode(payload, GUEST_JWT_SECRET, algorithm=GUEST_JWT_ALGORITHM)


def verify_guest_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(token, GUEST_JWT_SECRET, algorithms=[GUEST_JWT_ALGORITHM])
        if payload.get("type") != "guest":
            return None
        return payload
    except JWTError:
        return None
