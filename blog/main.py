from fastapi import FastAPI, Request, Depends, HTTPException, File, UploadFile
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import os
import shutil
from typing import Optional, List

from database import init_db, get_db
import crud
from models import PostCreate, PostUpdate, PostOut
import auth

app = FastAPI(title="My Personal Blog")

# 确保所需目录存在
os.makedirs('uploads', exist_ok=True)
os.makedirs('static', exist_ok=True)

# 挂载静态资源和上传的资源
app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

templates = Jinja2Templates(directory="templates")

# 初始化数据库
init_db()

# 包含认证路由
app.include_router(auth.router)

# ====================
# API 路由 (满足考核要求的核心接口)
# ====================

@app.get("/profile")
def get_profile():
    return {
        "name": "测试团队",
        "student_id": "2023000001, 2023000002",
        "description": "这是期中大作业演示的博客团队，使用了FastAPI和SQLite3技术栈。",
        "interests": ["Python后端开发", "前端基础", "人工智能"]
    }

@app.post("/posts", response_model=PostOut)
def create_post_api(post: PostCreate, conn=Depends(get_db)):
    post_id = crud.create_post(conn, post.title, post.content, post.category)
    new_post = crud.get_post(conn, post_id)
    return new_post

@app.get("/posts", response_model=List[PostOut])
def get_posts_api(skip: int = 0, limit: int = 10, conn=Depends(get_db)):
    return crud.get_posts(conn, skip=skip, limit=limit)

@app.get("/posts/{post_id}", response_model=PostOut)
def get_post_api(post_id: int, conn=Depends(get_db)):
    post = crud.get_post(conn, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="文章不存在")
    return post

@app.put("/posts/{post_id}", response_model=PostOut)
def update_post_api(post_id: int, post: PostUpdate, conn=Depends(get_db)):
    existing = crud.get_post(conn, post_id)
    if not existing:
        raise HTTPException(status_code=404, detail="文章不存在")
    crud.update_post(conn, post_id, post.title, post.content, post.category)
    return crud.get_post(conn, post_id)

@app.delete("/posts/{post_id}")
def delete_post_api(post_id: int, conn=Depends(get_db)):
    success = crud.delete_post(conn, post_id)
    if not success:
        raise HTTPException(status_code=404, detail="文章不存在")
    return {"detail": "文章删除成功"}

@app.post("/upload")
def upload_image(file: UploadFile = File(...)):
    file_location = f"uploads/{file.filename}"
    with open(file_location, "wb+") as file_object:
        shutil.copyfileobj(file.file, file_object)
    # 对于富文本编辑器返回可访问URL
    return {"url": f"/uploads/{file.filename}"}


# ====================
# 页面路由
# ====================

@app.get("/", response_class=HTMLResponse)
def read_root(request: Request, conn=Depends(get_db)):
    posts = crud.get_posts(conn, skip=0, limit=20)
    return templates.TemplateResponse(request=request, name="index.html", context={"request": request, "posts": posts})

@app.get("/post/{post_id}", response_class=HTMLResponse)
def read_post(request: Request, post_id: int, conn=Depends(get_db)):
    post = crud.get_post(conn, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="文章不存在")
    return templates.TemplateResponse(request=request, name="detail.html", context={"request": request, "post": post})

# 权限控制页面
@app.get("/admin", response_class=HTMLResponse)
def admin_page(request: Request, conn=Depends(get_db)):
    if not auth.get_current_user(request):
         return RedirectResponse(url="/login", status_code=302)
    posts = crud.get_posts(conn, skip=0, limit=100)
    return templates.TemplateResponse(request=request, name="admin_list.html", context={"request": request, "posts": posts})

@app.get("/admin/edit", response_class=HTMLResponse)
def admin_edit_page(request: Request, id: Optional[int] = None, conn=Depends(get_db)):
    if not auth.get_current_user(request):
         return RedirectResponse(url="/login", status_code=302)
    post = None
    if id:
        post = crud.get_post(conn, id)
    return templates.TemplateResponse(request=request, name="admin_form.html", context={"request": request, "post": post})
