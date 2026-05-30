import uuid
from datetime import datetime, timedelta, timezone

from jose import jwt, JWTError

from config import GUEST_JWT_SECRET, GUEST_JWT_ALGORITHM, GUEST_TOKEN_EXPIRE_HOURS

# In-memory blacklist for revoked guest tokens (jti -> expiry timestamp)
# Tokens are removed from the blacklist once they expire naturally.
GUEST_BLACKLISTED_TOKENS: dict[str, int] = {}


def _prune_blacklist(now: int | None = None) -> None:
    """Remove expired entries from the blacklist."""
    if not GUEST_BLACKLISTED_TOKENS:
        return
    current = now or int(datetime.now(timezone.utc).timestamp())
    expired = [jti for jti, exp in GUEST_BLACKLISTED_TOKENS.items() if exp <= current]
    for jti in expired:
        GUEST_BLACKLISTED_TOKENS.pop(jti, None)


def create_guest_token(user_id: int, username: str) -> str:
    """Create a signed JWT for an OAuth guest user with a unique jti for revocation."""
    expire = datetime.now(timezone.utc) + timedelta(hours=GUEST_TOKEN_EXPIRE_HOURS)
    payload = {
        "user_id": user_id,
        "username": username,
        "type": "guest",
        "exp": expire,
        "jti": str(uuid.uuid4()),
    }
    return jwt.encode(payload, GUEST_JWT_SECRET, algorithm=GUEST_JWT_ALGORITHM)


def verify_guest_token(token: str) -> dict | None:
    """Verify a guest JWT and return its payload, or None if invalid/revoked."""
    try:
        payload = jwt.decode(token, GUEST_JWT_SECRET, algorithms=[GUEST_JWT_ALGORITHM])
        if payload.get("type") != "guest":
            return None
        _prune_blacklist()
        jti = payload.get("jti")
        if jti and jti in GUEST_BLACKLISTED_TOKENS:
            return None
        return payload
    except JWTError:
        return None


def revoke_guest_token(token: str) -> bool:
    """Revoke a guest JWT by adding its jti to the blacklist."""
    try:
        payload = jwt.decode(token, GUEST_JWT_SECRET, algorithms=[GUEST_JWT_ALGORITHM])
        jti = payload.get("jti")
        exp = payload.get("exp")
        if jti:
            if isinstance(exp, (int, float)):
                GUEST_BLACKLISTED_TOKENS[jti] = int(exp)
            else:
                fallback_exp = datetime.now(timezone.utc) + timedelta(hours=GUEST_TOKEN_EXPIRE_HOURS)
                GUEST_BLACKLISTED_TOKENS[jti] = int(fallback_exp.timestamp())
            _prune_blacklist()
        return True
    except JWTError:
        return False
