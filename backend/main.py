import logging
import os
import sqlite3
from pathlib import Path

# ── Load environment variables BEFORE any other imports ──────────────────────
# This ensures .env.local is loaded before limiter.py and middleware.py read env vars
from dotenv import load_dotenv

_project_root = Path(__file__).parent.parent
_env_local = _project_root / ".env.local"
_env_file = _project_root / ".env"

if _env_local.exists():
    load_dotenv(_env_local, override=True)
load_dotenv(_env_file)

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from database import init_db, DB_FILE
from limiter import limiter
from routers.auth_router import router as auth_api_router
from routers.categories_router import router as categories_api_router
from routers.comments_router import router as comments_api_router, user_router as comments_user_router
from routers.favorites_router import post_router as favorites_post_router
from routers.favorites_router import user_router as favorites_user_router
from routers.posts_router import router as posts_api_router
from routers.oauth_router import router as oauth_api_router
from routers.upload_router import router as upload_api_router
from routers.admin_comments_router import router as admin_comments_router
from routers.admin_stats_router import router as admin_stats_router
from routers.admin_router import router as admin_api_router
from routers.user_router import router as user_api_router

from apscheduler.schedulers.background import BackgroundScheduler
from middleware import SecurityHeadersMiddleware, CSRFMiddleware
import sys

# ── Logging configuration ────────────────────────────────────────────────────
logging.basicConfig(
    level=os.environ.get("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# Add the scripts directory to sys.path for scrape_github_trending imports
scripts_dir = os.path.join(os.path.dirname(__file__), "scripts")
if scripts_dir not in sys.path:
    sys.path.append(scripts_dir)

try:
    from scrape_github_trending import main as scrape_trending_job
except ImportError:
    scrape_trending_job = None

# Use lifespan to manage the app lifecycle
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler = BackgroundScheduler()
    if scrape_trending_job:
        # Run every Monday at 00:00
        scheduler.add_job(scrape_trending_job, 'cron', day_of_week='mon', hour=0, minute=0)
        scheduler.start()
        logger.info("APScheduler started. Scheduled GitHub Trending scrape every Monday at 00:00.")
    yield
    scheduler.shutdown()
    logger.info("APScheduler stopped.")

app = FastAPI(title="My Personal Blog API", lifespan=lifespan)

# ── CORS configuration ───────────────────────────────────────────────────────
# In production, set ALLOWED_ORIGINS (comma-separated) for allowed origins
# Example: ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
_raw_origins = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
ALLOWED_ORIGINS = [origin.strip() for origin in _raw_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,                          # Allow cookies
    allow_methods=["GET", "POST", "PUT", "DELETE"],  # Explicit list, no wildcard
    allow_headers=["Content-Type", "X-CSRF-Token"],  # Least privilege
)

# ── Security middleware (order matters: last added = first executed) ────────
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(CSRFMiddleware)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

init_db()
os.makedirs("uploads", exist_ok=True)
app.mount("/api/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.get("/api/health")
async def health_check():
    """Health check endpoint for Docker/Kubernetes probes."""
    conn = None
    try:
        conn = sqlite3.connect(DB_FILE)
        conn.execute("SELECT 1")
        return {"status": "healthy", "database": "ok"}
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "database": str(e)}
        )
    finally:
        if conn:
            conn.close()


@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    # Handle 404 routes with a generic message
    return JSONResponse(status_code=404, content={"detail": "Route not found"})

app.include_router(auth_api_router, prefix="/api/auth", tags=["auth"])
app.include_router(categories_api_router, prefix="/api/categories", tags=["categories"])
app.include_router(posts_api_router, prefix="/api/posts", tags=["posts"])
app.include_router(comments_api_router, prefix="/api/posts", tags=["comments"])
app.include_router(comments_user_router, prefix="/api", tags=["comments"])
app.include_router(favorites_post_router, prefix="/api/posts", tags=["favorites"])
app.include_router(favorites_user_router, prefix="/api", tags=["favorites"])
app.include_router(upload_api_router, prefix="/api/upload", tags=["upload"])
app.include_router(oauth_api_router, prefix="/api/oauth", tags=["oauth"])
app.include_router(admin_comments_router, prefix="/api/admin/comments", tags=["admin-comments"])
app.include_router(admin_stats_router, prefix="/api/admin/stats", tags=["admin-stats"])
app.include_router(admin_api_router, prefix="/api/admin", tags=["admin"])
app.include_router(user_api_router, prefix="/api/user", tags=["user"])
