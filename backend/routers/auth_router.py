from fastapi import APIRouter, Form, HTTPException, Request, Response

from config import GUEST_COOKIE_NAME
from limiter import limiter
from middleware import _is_secure_request
from services.auth_service import (
    ACCESS_TOKEN_EXPIRE_HOURS,
    create_session_token,
    is_logged_in,
    login_ok,
    revoke_session_token,
)

router = APIRouter()


@router.post("/login")
@limiter.limit("5/minute")
def login(request: Request, response: Response, username: str = Form(...), password: str = Form(...)):
    if not login_ok(username, password):
        raise HTTPException(status_code=401, detail="invalid credentials")

    token = create_session_token(username)
    is_secure = _is_secure_request(request)
    response.set_cookie(
        "session",
        token,
        httponly=True,
        secure=is_secure,
        samesite="lax",
        max_age=ACCESS_TOKEN_EXPIRE_HOURS * 3600,
    )
    # Clear guest cookie to prevent identity conflict
    response.delete_cookie(GUEST_COOKIE_NAME, secure=is_secure)
    return {"ok": True}


@router.post("/logout")
def logout(request: Request, response: Response):
    token = request.cookies.get("session")
    if token:
        revoke_session_token(token)

    is_secure = _is_secure_request(request)
    response.delete_cookie("session", secure=is_secure)
    response.delete_cookie("csrf_token", secure=is_secure)
    # Also clear guest cookie on admin logout
    response.delete_cookie(GUEST_COOKIE_NAME, secure=is_secure)
    return {"ok": True}


@router.get("/me")
def me(request: Request):
    if not is_logged_in(request):
        raise HTTPException(status_code=401, detail="unauthorized")
    return {"username": "admin"}
