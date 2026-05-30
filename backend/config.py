import os
import secrets
from pathlib import Path
from dotenv import load_dotenv

# 加载 .env 文件（从项目根目录）
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)

GITHUB_CLIENT_ID = os.environ.get("GITHUB_CLIENT_ID", "")
GITHUB_CLIENT_SECRET = os.environ.get("GITHUB_CLIENT_SECRET", "")
GITHUB_REDIRECT_URI = os.environ.get("GITHUB_REDIRECT_URI", "http://localhost:8000/api/oauth/github/callback")

GITEE_CLIENT_ID = os.environ.get("GITEE_CLIENT_ID", "")
GITEE_CLIENT_SECRET = os.environ.get("GITEE_CLIENT_SECRET", "")
GITEE_REDIRECT_URI = os.environ.get("GITEE_REDIRECT_URI", "http://localhost:8000/api/oauth/gitee/callback")

GUEST_JWT_SECRET = os.environ.get("GUEST_JWT_SECRET", "")
if not GUEST_JWT_SECRET:
    GUEST_JWT_SECRET = secrets.token_hex(32)

GUEST_JWT_ALGORITHM = "HS256"
GUEST_TOKEN_EXPIRE_HOURS = 24

GUEST_COOKIE_NAME = "guest_session"
