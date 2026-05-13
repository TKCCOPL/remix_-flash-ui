from fastapi import Request

ADMIN_USER = "admin"
ADMIN_PASS = "123456"
SESSION_COOKIE = "admin_logged_in"


def login_ok(username: str, password: str) -> bool:
    return username == ADMIN_USER and password == ADMIN_PASS


def is_logged_in(request: Request) -> bool:
    return request.cookies.get("session") == SESSION_COOKIE
