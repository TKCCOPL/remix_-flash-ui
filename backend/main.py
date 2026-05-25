import os
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from database import init_db
from limiter import limiter
from routers.auth_router import router as auth_api_router
from routers.categories_router import router as categories_api_router
from routers.posts_router import router as posts_api_router
from routers.upload_router import router as upload_api_router

from apscheduler.schedulers.background import BackgroundScheduler
from middleware import SecurityHeadersMiddleware, CSRFMiddleware
import sys

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
        print("✅ APScheduler started. Scheduled GitHub Trending scrape every Monday at 00:00.")
    yield
    scheduler.shutdown()
    print("🛑 APScheduler stopped.")

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
@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    # Handle 404 routes with a generic message
    return JSONResponse(status_code=404, content={"detail": "Route not found"})

app.include_router(auth_api_router, prefix="/api/auth", tags=["auth"])
app.include_router(categories_api_router, prefix="/api/categories", tags=["categories"])
app.include_router(posts_api_router, prefix="/api/posts", tags=["posts"])
app.include_router(upload_api_router, prefix="/api/upload", tags=["upload"])
