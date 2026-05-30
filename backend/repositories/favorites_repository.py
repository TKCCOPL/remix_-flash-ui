import sqlite3


def add_favorite(conn: sqlite3.Connection, post_id: int, user_id: int) -> bool:
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO favorites (post_id, user_id) VALUES (?, ?)",
            (post_id, user_id),
        )
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        return False


def remove_favorite(conn: sqlite3.Connection, post_id: int, user_id: int) -> bool:
    cursor = conn.cursor()
    cursor.execute(
        "DELETE FROM favorites WHERE post_id = ? AND user_id = ?",
        (post_id, user_id),
    )
    conn.commit()
    return cursor.rowcount > 0


def check_is_favorited(conn: sqlite3.Connection, post_id: int, user_id: int) -> bool:
    cursor = conn.cursor()
    cursor.execute(
        "SELECT 1 FROM favorites WHERE post_id = ? AND user_id = ?",
        (post_id, user_id),
    )
    return cursor.fetchone() is not None


def get_favorites_by_user(
    conn: sqlite3.Connection,
    user_id: int,
    skip: int = 0,
    limit: int = 20,
) -> list[dict]:
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT f.id, f.post_id, f.user_id, f.created_at,
               p.title, p.category, p.image_url
        FROM favorites f
        JOIN posts p ON f.post_id = p.id
        WHERE f.user_id = ?
        ORDER BY f.created_at DESC
        LIMIT ? OFFSET ?
        """,
        (user_id, limit, skip),
    )
    return [dict(row) for row in cursor.fetchall()]
