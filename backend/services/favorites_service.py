import sqlite3

from repositories.favorites_repository import (
    add_favorite,
    remove_favorite,
    check_is_favorited,
    get_favorites_by_user,
    toggle_favorite_atomic,
)


def toggle_favorite(conn: sqlite3.Connection, post_id: int, user_id: int) -> bool:
    return toggle_favorite_atomic(conn, post_id, user_id)


def is_favorited(conn: sqlite3.Connection, post_id: int, user_id: int) -> bool:
    return check_is_favorited(conn, post_id, user_id)


def get_user_favorites(
    conn: sqlite3.Connection,
    user_id: int,
    skip: int = 0,
    limit: int = 20,
) -> list[dict]:
    return get_favorites_by_user(conn, user_id, skip=skip, limit=limit)
