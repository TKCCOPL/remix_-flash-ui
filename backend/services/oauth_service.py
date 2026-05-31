import logging
import sqlite3
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

from jose import jwt, JWTError

from config import GUEST_JWT_SECRET, GUEST_JWT_ALGORITHM, GUEST_TOKEN_EXPIRE_HOURS

logger = logging.getLogger(__name__)

# In-memory blacklist for revoked guest tokens (jti -> expiry timestamp)
# Tokens are removed from the blacklist once they expire naturally.
GUEST_BLACKLISTED_TOKENS: dict[str, int] = {}


def _get_db() -> sqlite3.Connection:
    """Get a database connection for token blacklist operations."""
    DB_FILE = str(Path(__file__).parent.parent / 'data' / 'blog.sqlite3')
    conn = sqlite3.connect(DB_FILE, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


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
        # Check database for persisted blacklist
        if jti:
            try:
                from repositories.token_repository import is_token_revoked
                conn = _get_db()
                try:
                    if is_token_revoked(conn, jti):
                        GUEST_BLACKLISTED_TOKENS[jti] = payload.get("exp", 0)
                        return None
                finally:
                    conn.close()
            except Exception:
                pass
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
            exp_ts = int(exp) if isinstance(exp, (int, float)) else int((datetime.now(timezone.utc) + timedelta(hours=GUEST_TOKEN_EXPIRE_HOURS)).timestamp())
            GUEST_BLACKLISTED_TOKENS[jti] = exp_ts
            _prune_blacklist()
            # Persist to database
            try:
                from repositories.token_repository import add_revoked_token
                conn = _get_db()
                try:
                    add_revoked_token(conn, jti, "guest", exp_ts)
                finally:
                    conn.close()
            except Exception as e:
                logger.warning(f"Failed to persist revoked guest token to database: {e}")
        return True
    except JWTError:
        return False
