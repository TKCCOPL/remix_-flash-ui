from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from config import GUEST_COOKIE_NAME
from database import get_db
from services.auth_service import verify_session_token
from services.comments_service import (
    create_comment,
    delete_comment,
    get_comments_by_post,
)
from repositories.comments_repository import get_comment_by_id
from services.oauth_service import verify_guest_token

router = APIRouter()


class CommentCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=1000)


def get_current_user(request: Request) -> dict | None:
    session_token = request.cookies.get("session")
    if session_token:
        username = verify_session_token(session_token)
        if username:
            return {"user_id": None, "username": username, "is_admin": True}

    guest_token = request.cookies.get(GUEST_COOKIE_NAME)
    if guest_token:
        payload = verify_guest_token(guest_token)
        if payload:
            return {
                "user_id": payload["user_id"],
                "username": payload["username"],
                "is_admin": False,
            }

    return None


def require_login(request: Request) -> dict:
    user = get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="unauthorized")
    return user


@router.get("/{post_id}/comments")
def list_comments_route(post_id: int, conn=Depends(get_db)):
    return get_comments_by_post(conn, post_id)


@router.post("/{post_id}/comments")
def create_comment_route(post_id: int, comment: CommentCreate, request: Request, conn=Depends(get_db)):
    user = require_login(request)

    if user["is_admin"]:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE username = ?", (user["username"],))
        admin_user = cursor.fetchone()
        if admin_user:
            user_id = admin_user["id"]
        else:
            cursor.execute(
                """
                INSERT INTO users (oauth_provider, oauth_id, username)
                VALUES ('admin', 'admin', ?)
                """,
                (user["username"],),
            )
            conn.commit()
            user_id = cursor.lastrowid
    else:
        user_id = user["user_id"]

    created = create_comment(conn, post_id, user_id, comment.content)
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
