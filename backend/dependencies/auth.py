"""Shared authentication dependencies for OAuth guest and admin session users."""

import sqlite3

from fastapi import HTTPException, Request

from config import GUEST_COOKIE_NAME
from services.auth_service import verify_session_token
from services.oauth_service import verify_guest_token


def get_current_user(request: Request) -> dict | None:
    """Extract the current user from session or guest cookie.

    Returns:
        dict with user_id, username, is_admin — or None if not logged in.
        For admin users, user_id is None (must be resolved via resolve_user_id).
    """
    session_token = request.cookies.get("session")
    if session_token:
        username = verify_session_token(session_token)
        if username:
            return {"user_id": None, "username": username, "is_admin": True}

    guest_token = request.cookies.get(GUEST_COOKIE_NAME)
    if guest_token:
        payload = verify_guest_token(guest_token)
        if payload:
            return {
                "user_id": payload["user_id"],
                "username": payload["username"],
                "is_admin": False,
            }

    return None


def require_login(request: Request) -> dict:
    """Return current user or raise 401."""
    user = get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="unauthorized")
    return user


def resolve_user_id(user: dict, conn: sqlite3.Connection) -> int:
    """Resolve a user dict to a database user_id.

    For admin users (user_id=None), looks up or creates a row in the users table.
    For guest users, returns the existing user_id directly.
    """
    if user["is_admin"]:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE username = ?", (user["username"],))
        admin_user = cursor.fetchone()
        if admin_user:
            return admin_user["id"]
        cursor.execute(
            """
            INSERT INTO users (oauth_provider, oauth_id, username)
            VALUES ('admin', 'admin', ?)
            """,
            (user["username"],),
        )
        conn.commit()
        return cursor.lastrowid
    return user["user_id"]
