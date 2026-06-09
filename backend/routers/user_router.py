from fastapi import APIRouter, Depends, HTTPException, Request
import sqlite3

from database import get_db
from config import GUEST_COOKIE_NAME
from services.auth_service import verify_session_token
from services.oauth_service import verify_guest_token
from repositories.users_repository import get_user_by_id

router = APIRouter()


@router.get("/me")
def get_current_user_info(request: Request, conn: sqlite3.Connection = Depends(get_db)):
    """Get current user info from either guest session or admin session."""
    guest_token = request.cookies.get(GUEST_COOKIE_NAME)
    if guest_token:
        payload = verify_guest_token(guest_token)
        if payload:
            user = get_user_by_id(conn, payload["user_id"])
            if user:
                return {
                    "id": user["id"],
                    "username": user["username"],
                    "avatar_url": user["avatar_url"],
                    "email": user["email"],
                    "oauth_provider": user["oauth_provider"],
                    "is_admin": False,
                    "role": user["role"] if "role" in user.keys() else "guest",
                }

    session_token = request.cookies.get("session")
    if session_token:
        username = verify_session_token(session_token)
        if username:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM users WHERE username = ? AND oauth_provider = 'admin'",
                (username,)
            )
            user = cursor.fetchone()
            if not user:
                cursor.execute(
                    "INSERT INTO users (oauth_provider, oauth_id, username, role) VALUES ('admin', 'admin', ?, 'admin')",
                    (username,)
                )
                conn.commit()
                cursor.execute(
                    "SELECT * FROM users WHERE username = ? AND oauth_provider = 'admin'",
                    (username,)
                )
                user = cursor.fetchone()
            # Ensure admin users always have admin role
            if user["role"] != "admin":
                cursor.execute(
                    "UPDATE users SET role = 'admin' WHERE id = ?",
                    (user["id"],)
                )
                conn.commit()
                user = dict(user)
                user["role"] = "admin"
            return {
                "id": user["id"],
                "username": user["username"],
                "avatar_url": user["avatar_url"],
                "email": user["email"],
                "oauth_provider": "admin",
                "is_admin": True,
                "role": user["role"] if "role" in user.keys() else "admin",
            }

    raise HTTPException(status_code=401, detail="Not logged in")
