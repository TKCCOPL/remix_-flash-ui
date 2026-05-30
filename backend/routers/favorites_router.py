from fastapi import APIRouter, Depends, HTTPException, Request

from config import GUEST_COOKIE_NAME
from database import get_db
from services.auth_service import verify_session_token
from services.favorites_service import (
    get_user_favorites,
    is_favorited,
    toggle_favorite,
)
from services.oauth_service import verify_guest_token

router = APIRouter()


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


def _resolve_user_id(user: dict, conn) -> int:
    if user["is_admin"]:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE username = ?", (user["username"],))
        admin_user = cursor.fetchone()
        if admin_user:
            return admin_user["id"]
        cursor.execute(
            """
            INSERT INTO users (oauth_provider, oauth_id, username)
            VALUES ('admin', 'admin', ?)
            """,
            (user["username"],),
        )
        conn.commit()
        return cursor.lastrowid
    return user["user_id"]


@router.post("/{post_id}/favorite")
def toggle_favorite_route(post_id: int, request: Request, conn=Depends(get_db)):
    user = require_login(request)
    user_id = _resolve_user_id(user, conn)
    is_now_favorited = toggle_favorite(conn, post_id, user_id)
    return {"favorited": is_now_favorited}


@router.get("/{post_id}/is-favorited")
def check_favorited_route(post_id: int, request: Request, conn=Depends(get_db)):
    user = require_login(request)
    user_id = _resolve_user_id(user, conn)
    return {"favorited": is_favorited(conn, post_id, user_id)}


@router.get("/users/me/favorites")
def list_favorites_route(
    skip: int = 0,
    limit: int = 20,
    request: Request = None,
    conn=Depends(get_db),
):
    user = require_login(request)
    user_id = _resolve_user_id(user, conn)
    return get_user_favorites(conn, user_id, skip=skip, limit=limit)
