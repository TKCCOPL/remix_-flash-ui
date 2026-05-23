from fastapi import APIRouter, Depends, HTTPException, Request

from database import get_db
from schemas import PostCreate, PostOut, PostUpdate
from services.auth_service import is_logged_in
from services.posts_service import (
    create_post,
    delete_post,
    get_post,
    list_posts,
    update_post,
)

router = APIRouter()


def _require_login(request: Request):
    if not is_logged_in(request):
        raise HTTPException(status_code=401, detail="unauthorized")


@router.post("", response_model=PostOut)
def create_post_route(post: PostCreate, request: Request, conn=Depends(get_db)):
    _require_login(request)
    return create_post(conn, post)


@router.get("", response_model=list[PostOut])
def list_posts_route(skip: int = 0, limit: int = 10, conn=Depends(get_db)):
    return list_posts(conn, skip=skip, limit=limit)


@router.get("/{post_id}", response_model=PostOut)
def get_post_route(post_id: int, conn=Depends(get_db)):
    post = get_post(conn, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="文章不存在")
    return post


@router.put("/{post_id}", response_model=PostOut)
def update_post_route(post_id: int, post: PostUpdate, request: Request, conn=Depends(get_db)):
    _require_login(request)
    updated = update_post(conn, post_id, post)
    if not updated:
        raise HTTPException(status_code=404, detail="文章不存在")
    return updated


@router.delete("/{post_id}")
def delete_post_route(post_id: int, request: Request, conn=Depends(get_db)):
    _require_login(request)
    if not delete_post(conn, post_id):
        raise HTTPException(status_code=404, detail="文章不存在")
    return {"detail": "文章删除成功"}
