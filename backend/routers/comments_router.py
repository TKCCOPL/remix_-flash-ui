from fastapi import APIRouter, Depends, HTTPException, Query, Request

from database import get_db
from dependencies.auth import require_login, resolve_user_id
from schemas import CommentCreate
from services.comments_service import (
    create_comment,
    delete_comment,
    get_comments_by_post,
    get_comments_by_user,
)
from repositories.comments_repository import get_comment_by_id

router = APIRouter()

# User-scoped routes: mounted at /api
user_router = APIRouter()


@router.get("/{post_id}/comments")
def list_comments_route(post_id: int, conn=Depends(get_db)):
    return get_comments_by_post(conn, post_id)


@router.post("/{post_id}/comments")
def create_comment_route(post_id: int, comment: CommentCreate, request: Request, conn=Depends(get_db)):
    user = require_login(request)
    user_id = resolve_user_id(user, conn)

    created = create_comment(conn, post_id, user_id, comment.content, parent_id=comment.parent_id)
    return created


@router.delete("/comments/{comment_id}")
def delete_comment_route(comment_id: int, request: Request, conn=Depends(get_db)):
    user = require_login(request)

    existing = get_comment_by_id(conn, comment_id)
    if not existing:
        raise HTTPException(status_code=404, detail="comment not found")

    if user["is_admin"]:
        from repositories.comments_repository import delete_comment_record
        delete_comment_record(conn, comment_id)
        return {"detail": "comment deleted"}

    if existing["user_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="forbidden")

    delete_comment(conn, comment_id, user["user_id"])
    return {"detail": "comment deleted"}


@user_router.get("/users/me/comments")
def get_my_comments(
    request: Request,
    conn=Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
):
    """Get current user's comments."""
    user = require_login(request)
    user_id = resolve_user_id(user, conn)
    comments = get_comments_by_user(conn, user_id, skip, limit)
    return comments
