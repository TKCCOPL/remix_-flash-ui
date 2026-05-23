from fastapi import FastAPI

from database import init_db
from routers.auth_router import router as auth_api_router
from routers.categories_router import router as categories_api_router
from routers.posts_router import router as posts_api_router

app = FastAPI(title="My Personal Blog API")

init_db()

app.include_router(auth_api_router, prefix="/api/auth", tags=["auth"])
app.include_router(categories_api_router, prefix="/api/categories", tags=["categories"])
app.include_router(posts_api_router, prefix="/api/posts", tags=["posts"])
