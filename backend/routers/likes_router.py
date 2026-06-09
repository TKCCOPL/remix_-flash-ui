# backend/routers/likes_router.py
from fastapi import APIRouter, Depends, HTTPException, Request

from database import get_db
from dependencies.auth import get_current_user, require_login, resolve_user_id
from services.likes_service import toggle_like, get_like_status, get_batch_like_status

router = APIRouter()


@router.post("/{post_id}/like")
def toggle_like_endpoint(post_id: int, request: Request, conn=Depends(get_db)):
    """Toggle like status for a post."""
    user = require_login(request)
    user_id = resolve_user_id(user, conn)
    return toggle_like(conn, user_id=user_id, post_id=post_id)


@router.get("/{post_id}/is-liked")
def check_liked_endpoint(post_id: int, request: Request, conn=Depends(get_db)):
    """Check if current user has liked a post."""
    user = get_current_user(request)
    user_id = None
    if user:
        user_id = resolve_user_id(user, conn)
    return get_like_status(conn, post_id, user_id)


@router.get("/like-status")
def get_like_status_endpoint(ids: str, request: Request, conn=Depends(get_db)):
    """Get like status for multiple posts."""
    try:
        post_ids = [int(id.strip()) for id in ids.split(",")]
    except ValueError:
        raise HTTPException(400, "Invalid ids format")

    user = get_current_user(request)
    user_id = None
    if user:
        user_id = resolve_user_id(user, conn)
    return get_batch_like_status(conn, user_id, post_ids)
