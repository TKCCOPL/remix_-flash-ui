import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from database import init_db
from routers.auth_router import router as auth_api_router
from routers.categories_router import router as categories_api_router
from routers.posts_router import router as posts_api_router
from routers.upload_router import router as upload_api_router

app = FastAPI(title="My Personal Blog API")

init_db()

os.makedirs("uploads", exist_ok=True)
app.mount("/api/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(auth_api_router, prefix="/api/auth", tags=["auth"])
app.include_router(categories_api_router, prefix="/api/categories", tags=["categories"])
app.include_router(posts_api_router, prefix="/api/posts", tags=["posts"])
app.include_router(upload_api_router, prefix="/api/upload", tags=["upload"])
