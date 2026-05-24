from fastapi import APIRouter, Form, HTTPException, Request, Response

from limiter import limiter
from services.auth_service import create_session_token, is_logged_in, login_ok, ACCESS_TOKEN_EXPIRE_HOURS

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
        httponly=True,          # 禁止 JS 访问
        secure=True,            # 仅通过 HTTPS 传输
        samesite="lax",         # 防 CSRF
        max_age=ACCESS_TOKEN_EXPIRE_HOURS * 3600,  # 24 小时过期
    )
    return {"ok": True}


@router.post("/logout")
def logout(request: Request, response: Response):
    token = request.cookies.get("session")
    if token:
        from services.auth_service import revoke_session_token
        revoke_session_token(token)
        
    response.delete_cookie("session")
    response.delete_cookie("csrf_token")
    return {"ok": True}


@router.get("/me")
def me(request: Request):
    if not is_logged_in(request):
        raise HTTPException(status_code=401, detail="unauthorized")
    return {"username": "admin"}
