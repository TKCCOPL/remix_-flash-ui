import logging
import os
import secrets

logger = logging.getLogger(__name__)

# Environment variables are loaded in main.py before any other imports
# This module only reads from os.environ

GITHUB_CLIENT_ID = os.environ.get("GITHUB_CLIENT_ID", "")
GITHUB_CLIENT_SECRET = os.environ.get("GITHUB_CLIENT_SECRET", "")
GITHUB_REDIRECT_URI = os.environ.get("GITHUB_REDIRECT_URI", "http://localhost:8000/api/oauth/github/callback")

GITEE_CLIENT_ID = os.environ.get("GITEE_CLIENT_ID", "")
GITEE_CLIENT_SECRET = os.environ.get("GITEE_CLIENT_SECRET", "")
GITEE_REDIRECT_URI = os.environ.get("GITEE_REDIRECT_URI", "http://localhost:8000/api/oauth/gitee/callback")

# Frontend URL for OAuth redirect after login
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")

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
