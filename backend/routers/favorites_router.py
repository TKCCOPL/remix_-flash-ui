from fastapi import APIRouter, Depends, Request

from database import get_db
from dependencies.auth import require_login, resolve_user_id
from services.favorites_service import (
    get_user_favorites,
    is_favorited,
    toggle_favorite,
)

# Post-scoped routes: mounted at /api/posts
post_router = APIRouter()

# User-scoped routes: mounted at /api
user_router = APIRouter()


@post_router.post("/{post_id}/favorite")
def toggle_favorite_route(post_id: int, request: Request, conn=Depends(get_db)):
    user = require_login(request)
    user_id = resolve_user_id(user, conn)
    is_now_favorited = toggle_favorite(conn, post_id, user_id)
    return {"favorited": is_now_favorited}


@post_router.get("/{post_id}/is-favorited")
def check_favorited_route(post_id: int, request: Request, conn=Depends(get_db)):
    user = require_login(request)
    user_id = resolve_user_id(user, conn)
    return {"favorited": is_favorited(conn, post_id, user_id)}


@user_router.get("/users/me/favorites")
def list_favorites_route(
    skip: int = 0,
    limit: int = 20,
    request: Request = None,
    conn=Depends(get_db),
):
    user = require_login(request)
    user_id = resolve_user_id(user, conn)
    return get_user_favorites(conn, user_id, skip=skip, limit=limit)
