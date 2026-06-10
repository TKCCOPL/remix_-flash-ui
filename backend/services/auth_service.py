import logging
import os
import secrets
import sqlite3
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import Request
from jose import JWTError, jwt

logger = logging.getLogger(__name__)

# ── 凭证从环境变量读取，禁止硬编码 ──────────────────────────────────────────
ADMIN_USER: str = os.environ.get("ADMIN_USER", "admin")
ADMIN_PASS: str | None = os.environ.get("ADMIN_PASS")  # 生产环境必须设置，无默认值

BLACKLISTED_TOKENS: dict[str, int] = {}


def _get_db() -> sqlite3.Connection:
    """Get a database connection for token blacklist operations."""
    DB_FILE = str(Path(__file__).parent.parent / 'data' / 'blog.sqlite3')
    conn = sqlite3.connect(DB_FILE, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def _prune_blacklist(now: int | None = None) -> None:
    if not BLACKLISTED_TOKENS:
        return
    current = now or int(datetime.now(timezone.utc).timestamp())
    expired = [jti for jti, exp in BLACKLISTED_TOKENS.items() if exp <= current]
    for jti in expired:
        BLACKLISTED_TOKENS.pop(jti, None)

# ── JWT 密钥：生产环境必须通过 SECRET_KEY 环境变量注入 ─────────────────────
# 若未设置，每次重启都会生成随机 key（重启后所有已登录 session 失效）
SECRET_KEY: str = os.environ.get("SECRET_KEY", "")
if not SECRET_KEY:
    logger.warning("SECRET_KEY environment variable is not set. Generated an ephemeral key; sessions expire on restart.")
    SECRET_KEY = secrets.token_hex(32)

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24


def login_ok(username: str, password: str) -> bool:
    """验证用户名和密码（恒定时间比较防止时序攻击）"""
    if ADMIN_PASS is None:
        # 生产环境未设置 ADMIN_PASS，拒绝所有登录
        return False
    user_match = secrets.compare_digest(username, ADMIN_USER)
    pass_match = secrets.compare_digest(password, ADMIN_PASS)
    return user_match and pass_match


def create_session_token(username: str) -> str:
    """生成签名 JWT token"""
    expire = datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    payload = {"sub": username, "exp": expire, "jti": str(uuid.uuid4())}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def verify_session_token(token: str) -> str | None:
    """验证 JWT token，返回用户名；无效或过期返回 None"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str | None = payload.get("sub")
        jti = payload.get("jti")
        _prune_blacklist()
        if jti in BLACKLISTED_TOKENS:
            return None
        # Check database for persisted blacklist
        try:
            from repositories.token_repository import is_token_revoked
            conn = _get_db()
            try:
                if is_token_revoked(conn, jti):
                    BLACKLISTED_TOKENS[jti] = payload.get("exp", 0)
                    return None
            finally:
                conn.close()
        except Exception as e:
            # Fail closed: if blacklist check fails, reject the token
            logger.error(f"Token blacklist check failed: {e}")
            return None
        return username
    except JWTError:
        return None


def is_logged_in(request: Request) -> bool:
    """检查请求是否携带有效的已签名 session token"""
    token = request.cookies.get("session")
    if not token:
        return False
    return verify_session_token(token) is not None

def revoke_session_token(token: str) -> bool:
    """将 token 的 jti 加入黑名单"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        jti = payload.get("jti")
        exp = payload.get("exp")
        if jti:
            exp_ts = int(exp) if isinstance(exp, (int, float)) else int((datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)).timestamp())
            BLACKLISTED_TOKENS[jti] = exp_ts
            _prune_blacklist()
            # Persist to database
            try:
                from repositories.token_repository import add_revoked_token
                conn = _get_db()
                try:
                    add_revoked_token(conn, jti, "admin", exp_ts)
                finally:
                    conn.close()
            except Exception as e:
                logger.warning(f"Failed to persist revoked token to database: {e}")
        return True
    except JWTError:
        return False
