"""Shared authentication dependencies for OAuth guest and admin session users."""

import sqlite3

from fastapi import Depends, HTTPException, Request

from config import GUEST_COOKIE_NAME
from database import DB_FILE
from services.auth_service import verify_session_token
from services.oauth_service import verify_guest_token

VALID_ROLES = {"admin", "editor", "author", "guest"}


def get_current_user(request: Request) -> dict | None:
    """Extract the current user from session or guest cookie.

    Returns:
        dict with user_id, username, is_admin, role — or None if not logged in.
        For admin users, user_id is None (must be resolved via resolve_user_id).

    Priority: guest_session first, then admin session.
    This ensures guests can comment even when admin is logged in.
    Admin dashboard uses is_logged_in() which only checks the session cookie.
    """
    # Check guest session first - guests should be able to comment
    guest_token = request.cookies.get(GUEST_COOKIE_NAME)
    if guest_token:
        payload = verify_guest_token(guest_token)
        if payload:
            # Get role from users table
            conn = sqlite3.connect(DB_FILE)
            conn.row_factory = sqlite3.Row
            try:
                cursor = conn.execute(
                    "SELECT role FROM users WHERE id = ?",
                    (payload["user_id"],),
                )
                row = cursor.fetchone()
                role = row["role"] if row else "guest"
            finally:
                conn.close()
            return {
                "user_id": payload["user_id"],
                "username": payload["username"],
                "is_admin": False,
                "role": role,
            }

    # Fall back to admin session
    session_token = request.cookies.get("session")
    if session_token:
        username = verify_session_token(session_token)
        if username:
            return {"user_id": None, "username": username, "is_admin": True, "role": "admin"}

    return None


def require_login(request: Request) -> dict:
    """Return current user or raise 401."""
    user = get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="unauthorized")
    return user


def require_admin(request: Request) -> dict:
    """Return current admin user or raise 401/403.

    Best practice: hierarchical dependency injection pattern.
    See: https://fastapi.tiangolo.com/tutorial/dependencies/
    """
    user = get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="unauthorized")
    if not user["is_admin"]:
        raise HTTPException(status_code=403, detail="admin access required")
    return user


def require_role(*allowed_roles: str):
    """Dependency factory that requires specific roles.

    Usage:
        @router.get("/admin/posts", dependencies=[require_role("admin", "editor")])
        async def list_posts(user: dict = Depends(require_login)):
            ...
    """
    async def dependency(user: dict = Depends(require_login)):
        role = user.get("role", "guest")
        if role not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail=f"权限不足，需要角色: {', '.join(allowed_roles)}",
            )
        return user

    return Depends(dependency)


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
