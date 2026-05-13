from fastapi import APIRouter, Request, Form
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates

router = APIRouter()
templates = Jinja2Templates(directory="templates")

ADMIN_USER = "admin"
ADMIN_PASS = "123456"

def get_current_user(request: Request) -> bool:
    session = request.cookies.get("session")
    return session == "admin_logged_in"

@router.get("/login", response_class=HTMLResponse)
def login_page(request: Request):
    return templates.TemplateResponse(request=request, name="login.html", context={})

@router.post("/login")
def login(username: str = Form(...), password: str = Form(...)):
    if username == ADMIN_USER and password == ADMIN_PASS:
        response = RedirectResponse(url="/admin", status_code=302)
        response.set_cookie(key="session", value="admin_logged_in", httponly=True)
        return response
    # 登录失败重定向回登录页并带有错误标记
    return RedirectResponse(url="/login?error=1", status_code=302)

@router.get("/logout")
def logout():
    response = RedirectResponse(url="/login", status_code=302)
    response.delete_cookie("session")
    return response
