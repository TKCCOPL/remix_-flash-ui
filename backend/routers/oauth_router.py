import os
import secrets
import sqlite3

from fastapi import APIRouter, Request, Response, HTTPException
from fastapi.responses import RedirectResponse

from oauth_providers import get_provider
from services.oauth_service import create_guest_token
from repositories.users_repository import create_or_update_user, get_user_by_id
from database import DB_FILE
from config import GUEST_COOKIE_NAME, GUEST_TOKEN_EXPIRE_HOURS

router = APIRouter()
_state_store: dict[str, str] = {}


@router.get("/me")
async def oauth_me(request: Request):
    from services.oauth_service import verify_guest_token

    token = request.cookies.get(GUEST_COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="Not logged in")

    payload = verify_guest_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    try:
        user = get_user_by_id(conn, payload["user_id"])
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return {
            "id": user["id"],
            "username": user["username"],
            "avatar_url": user["avatar_url"],
            "email": user["email"],
        }
    finally:
        conn.close()


@router.post("/logout")
async def oauth_logout():
    response = Response(status_code=204)
    response.delete_cookie(GUEST_COOKIE_NAME)
    return response


@router.get("/{provider}")
async def oauth_login(provider: str, request: Request):
    try:
        oauth_provider = get_provider(provider)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Unsupported provider: {provider}")

    state = secrets.token_urlsafe(32)
    _state_store[state] = provider
    authorize_url = oauth_provider.get_authorize_url(state)
    return RedirectResponse(url=authorize_url)


@router.get("/{provider}/callback")
async def oauth_callback(
    provider: str, code: str, state: str, request: Request, response: Response
):
    if state not in _state_store or _state_store[state] != provider:
        raise HTTPException(status_code=400, detail="Invalid state parameter")
    del _state_store[state]

    try:
        oauth_provider = get_provider(provider)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Unsupported provider: {provider}")

    access_token = await oauth_provider.exchange_code_for_token(code)
    if not access_token:
        raise HTTPException(status_code=400, detail="Failed to get access token")

    user_info = await oauth_provider.get_user_info(access_token)
    if not user_info:
        raise HTTPException(status_code=400, detail="Failed to get user info")

    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    try:
        user = create_or_update_user(
            conn,
            oauth_provider=provider,
            oauth_id=user_info["oauth_id"],
            username=user_info["username"],
            avatar_url=user_info.get("avatar_url"),
            email=user_info.get("email"),
        )
    finally:
        conn.close()

    token = create_guest_token(user_id=user["id"], username=user["username"])
    # 重定向到前端页面
    frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
    redirect_response = RedirectResponse(url=frontend_url)
    redirect_response.set_cookie(
        GUEST_COOKIE_NAME,
        token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=GUEST_TOKEN_EXPIRE_HOURS * 3600,
    )
    return redirect_response
