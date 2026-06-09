# backend/services/likes_service.py
import sqlite3
from repositories.likes_repository import (
    toggle_like_atomic,
    count_likes,
    check_is_liked,
    get_likes_for_posts
)

def toggle_like(conn: sqlite3.Connection, user_id: int, post_id: int) -> dict:
    """Toggle like and return result."""
    liked = toggle_like_atomic(conn, user_id, post_id)
    like_count = count_likes(conn, post_id)
    return {"liked": liked, "like_count": like_count}

def get_like_status(conn: sqlite3.Connection, post_id: int, user_id: int | None = None) -> dict:
    """Get like status for a post."""
    like_count = count_likes(conn, post_id)
    liked = False
    if user_id:
        liked = check_is_liked(conn, post_id, user_id)
    return {"liked": liked, "like_count": like_count}

def get_batch_like_status(conn: sqlite3.Connection, user_id: int | None, post_ids: list[int]) -> dict:
    """Get like status for multiple posts."""
    if not user_id:
        return {str(pid): {"liked": False, "count": count_likes(conn, pid)} for pid in post_ids}
    return get_likes_for_posts(conn, user_id, post_ids)
