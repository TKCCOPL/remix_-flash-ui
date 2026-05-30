import hashlib

from fastapi import APIRouter, Depends, HTTPException, Request

from database import get_db
from schemas import PostCreate, PostOut, PostUpdate
from services.auth_service import is_logged_in
from repositories.posts_repository import increment_view_count, get_post_with_stats
from services.posts_service import (
    create_post,
    delete_post,
    get_archive_data,
    get_post,
    list_posts,
    search_posts_by_query,
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
def list_posts_route(skip: int = 0, limit: int = 10, include_drafts: bool = False, request: Request = None, conn=Depends(get_db)):
    # Only allow drafts if explicitly requested AND user is logged in
    actual_include = include_drafts and (request and is_logged_in(request))
    return list_posts(conn, skip=skip, limit=limit, include_drafts=actual_include)


@router.get("/archive")
def get_archive_route(include_drafts: bool = False, request: Request = None, conn=Depends(get_db)):
    actual_include = include_drafts and (request and is_logged_in(request))
    return get_archive_data(conn, include_drafts=actual_include)


@router.get("/search")
def search_posts_route(q: str, include_drafts: bool = False, request: Request = None, conn=Depends(get_db)):
    # 对 IP 进行单向哈希处理，避免记录可识别个人身份的原始 IP（GDPR/个保法合规）
    raw_ip = request.client.host if request and request.client else ""
    hashed_ip = hashlib.sha256(raw_ip.encode()).hexdigest()[:16] if raw_ip else None
    actual_include = include_drafts and (request and is_logged_in(request))
    results = search_posts_by_query(conn, q, hashed_ip, include_drafts=actual_include)
    return {"results": results, "total": len(results)}


@router.get("/{post_id}", response_model=PostOut)
def get_post_route(post_id: int, request: Request, conn=Depends(get_db)):
    post = get_post(conn, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="文章不存在")
    if post.get("status") == "draft" and not is_logged_in(request):
        raise HTTPException(status_code=404, detail="文章不存在")
    increment_view_count(conn, post_id)
    result = get_post_with_stats(conn, post_id)
    if not result:
        raise HTTPException(status_code=404, detail="文章不存在")
    return result


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
