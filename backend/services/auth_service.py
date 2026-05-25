import logging
import os
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import Request
from jose import JWTError, jwt

logger = logging.getLogger(__name__)

# ── 凭证从环境变量读取，禁止硬编码 ──────────────────────────────────────────
ADMIN_USER: str = os.environ.get("ADMIN_USER", "admin")
ADMIN_PASS: str | None = os.environ.get("ADMIN_PASS")  # 生产环境必须设置，无默认值

import uuid
BLACKLISTED_TOKENS = set()

# ── JWT 密钥：生产环境必须通过 SECRET_KEY 环境变量注入 ─────────────────────
# 若未设置，每次重启都会生成随机 key（重启后所有已登录 session 失效）
SECRET_KEY: str = os.environ.get("SECRET_KEY", "")
if not SECRET_KEY:
    logger.warning("SECRET_KEY environment variable is not set. JWT tokens will be invalid/ephemeral.")
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
        if payload.get("jti") in BLACKLISTED_TOKENS:
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
        if jti:
            BLACKLISTED_TOKENS.add(jti)
        return True
    except JWTError:
        return False
