from fastapi import APIRouter, Form, HTTPException, Request, Response

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
    response.set_cookie(
        "session",
        token,
        httponly=True,
        secure=_is_secure_request(request),
        samesite="lax",
        max_age=ACCESS_TOKEN_EXPIRE_HOURS * 3600,
    )
    return {"ok": True}


@router.post("/logout")
def logout(request: Request, response: Response):
    token = request.cookies.get("session")
    if token:
        revoke_session_token(token)

    secure = _is_secure_request(request)
    response.delete_cookie("session", secure=secure)
    response.delete_cookie("csrf_token", secure=secure)
    return {"ok": True}


@router.get("/me")
def me(request: Request):
    if not is_logged_in(request):
        raise HTTPException(status_code=401, detail="unauthorized")
    return {"username": "admin"}
