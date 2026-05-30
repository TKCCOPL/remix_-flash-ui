import os
import secrets
import sqlite3

from fastapi import APIRouter, Depends, Request, Response, HTTPException
from fastapi.responses import RedirectResponse

from database import DB_FILE, get_db
from middleware import _is_secure_request
from oauth_providers import get_provider
from services.oauth_service import create_guest_token, revoke_guest_token, verify_guest_token
from repositories.users_repository import create_or_update_user, get_user_by_id
from config import GUEST_COOKIE_NAME, GUEST_TOKEN_EXPIRE_HOURS

router = APIRouter()


@router.get("/me")
async def oauth_me(request: Request, conn: sqlite3.Connection = Depends(get_db)):
    token = request.cookies.get(GUEST_COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="Not logged in")

    payload = verify_guest_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = get_user_by_id(conn, payload["user_id"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "id": user["id"],
        "username": user["username"],
        "avatar_url": user["avatar_url"],
        "email": user["email"],
        "oauth_provider": user["oauth_provider"],
    }


@router.post("/logout")
async def oauth_logout(request: Request):
    token = request.cookies.get(GUEST_COOKIE_NAME)
    if token:
        revoke_guest_token(token)
    response = Response(status_code=204)
    response.delete_cookie(GUEST_COOKIE_NAME)
    # Also clear admin session cookie on guest logout
    response.delete_cookie("session")
    response.delete_cookie("csrf_token")
    return response


@router.get("/{provider}")
async def oauth_login(provider: str, request: Request, conn: sqlite3.Connection = Depends(get_db)):
    try:
        oauth_provider = get_provider(provider)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Unsupported provider: {provider}")

    state = secrets.token_urlsafe(32)
    cursor = conn.cursor()
    cursor.execute("INSERT INTO oauth_states (state, provider) VALUES (?, ?)", (state, provider))
    conn.commit()

    authorize_url = oauth_provider.get_authorize_url(state)
    return RedirectResponse(url=authorize_url)


@router.get("/{provider}/callback")
async def oauth_callback(
    provider: str, code: str, state: str, request: Request,
    conn: sqlite3.Connection = Depends(get_db),
):
    # Validate state from database
    cursor = conn.cursor()
    cursor.execute("SELECT provider FROM oauth_states WHERE state = ?", (state,))
    row = cursor.fetchone()
    if not row or row["provider"] != provider:
        raise HTTPException(status_code=400, detail="Invalid state parameter")

    # Delete used state and clean up expired states (>10 minutes)
    cursor.execute("DELETE FROM oauth_states WHERE state = ?", (state,))
    cursor.execute("DELETE FROM oauth_states WHERE created_at < datetime('now', '-10 minutes')")
    conn.commit()

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

    user = create_or_update_user(
        conn,
        oauth_provider=provider,
        oauth_id=user_info["oauth_id"],
        username=user_info["username"],
        avatar_url=user_info.get("avatar_url"),
        email=user_info.get("email"),
    )

    token = create_guest_token(user_id=user["id"], username=user["username"])
    frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
    redirect_response = RedirectResponse(url=frontend_url)
    redirect_response.set_cookie(
        GUEST_COOKIE_NAME,
        token,
        httponly=True,
        secure=_is_secure_request(request),
        samesite="lax",
        max_age=GUEST_TOKEN_EXPIRE_HOURS * 3600,
    )
    # Clear admin session cookie to prevent identity conflict
    redirect_response.delete_cookie("session")
    redirect_response.delete_cookie("csrf_token")
    return redirect_response
