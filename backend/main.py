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

# 把 scripts 目录加入路径，以方便导入 scrape_github_trending
scripts_dir = os.path.join(os.path.dirname(__file__), "scripts")
if scripts_dir not in sys.path:
    sys.path.append(scripts_dir)

try:
    from scrape_github_trending import main as scrape_trending_job
except ImportError:
    scrape_trending_job = None

# 使用 lifespan 管理应用的生命周期
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler = BackgroundScheduler()
    if scrape_trending_job:
        # 每周一 00:00 自动更新
        scheduler.add_job(scrape_trending_job, 'cron', day_of_week='mon', hour=0, minute=0)
        scheduler.start()
        print("✅ APScheduler started. Scheduled GitHub Trending scrape every Monday at 00:00.")
    yield
    scheduler.shutdown()
    print("🛑 APScheduler stopped.")

app = FastAPI(title="My Personal Blog API", lifespan=lifespan)

# ── CORS 配置 ────────────────────────────────────────────────────────────────
# 生产环境通过 ALLOWED_ORIGINS 环境变量设置允许的域名，多个域名用逗号分隔
# 例：ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
_raw_origins = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
ALLOWED_ORIGINS = [origin.strip() for origin in _raw_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,                          # 允许携带 cookie
    allow_methods=["GET", "POST", "PUT", "DELETE"],  # 明确列出，不使用通配符
    allow_headers=["Content-Type", "X-CSRF-Token"],  # 最小权限
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
    # 修复：增加 404 路由处理
    return JSONResponse(status_code=404, content={"detail": "API Route not found"})

app.include_router(auth_api_router, prefix="/api/auth", tags=["auth"])
app.include_router(categories_api_router, prefix="/api/categories", tags=["categories"])
app.include_router(posts_api_router, prefix="/api/posts", tags=["posts"])
app.include_router(upload_api_router, prefix="/api/upload", tags=["upload"])
