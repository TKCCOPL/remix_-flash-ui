from fastapi import APIRouter, Form, HTTPException, Request, Response

from services.auth_service import is_logged_in, login_ok

router = APIRouter()


@router.post("/login")
def login(response: Response, username: str = Form(...), password: str = Form(...)):
    if not login_ok(username, password):
        raise HTTPException(status_code=401, detail="invalid credentials")
    response.set_cookie("session", "admin_logged_in", httponly=True)
    return {"ok": True}


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie("session")
    return {"ok": True}


@router.get("/me")
def me(request: Request):
    if not is_logged_in(request):
        raise HTTPException(status_code=401, detail="unauthorized")
    return {"username": "admin"}
