import logging
import os
import secrets
from pathlib import Path
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

# 加载 .env 文件（从项目根目录）
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)

GITHUB_CLIENT_ID = os.environ.get("GITHUB_CLIENT_ID", "")
GITHUB_CLIENT_SECRET = os.environ.get("GITHUB_CLIENT_SECRET", "")
GITHUB_REDIRECT_URI = os.environ.get("GITHUB_REDIRECT_URI", "http://localhost:8001/api/oauth/github/callback")

GITEE_CLIENT_ID = os.environ.get("GITEE_CLIENT_ID", "")
GITEE_CLIENT_SECRET = os.environ.get("GITEE_CLIENT_SECRET", "")
GITEE_REDIRECT_URI = os.environ.get("GITEE_REDIRECT_URI", "http://localhost:8001/api/oauth/gitee/callback")

# Warn if OAuth credentials are not configured
for _var in ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET", "GITEE_CLIENT_ID", "GITEE_CLIENT_SECRET"]:
    if not os.environ.get(_var):
        logger.warning(f"{_var} is not set. OAuth login for this provider will fail.")

GUEST_JWT_SECRET = os.environ.get("GUEST_JWT_SECRET", "")
if not GUEST_JWT_SECRET:
    logger.warning("GUEST_JWT_SECRET is not set. Generated a random secret; tokens expire on restart.")
    GUEST_JWT_SECRET = secrets.token_hex(32)

GUEST_JWT_ALGORITHM = "HS256"
GUEST_TOKEN_EXPIRE_HOURS = 24

GUEST_COOKIE_NAME = "guest_session"
