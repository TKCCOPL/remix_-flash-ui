import sqlite3


def _escape_like(val: str) -> str:
    """Escape special LIKE characters % _ and \\ for SQLite."""
    return val.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def get_comments_with_filter(
    conn: sqlite3.Connection,
    status: str = None,
    search: str = None,
    skip: int = 0,
    limit: int = 20,
) -> list[dict]:
    cursor = conn.cursor()
    query = """
        SELECT
            c.id, c.post_id, c.user_id, c.content, c.status, c.created_at,
            u.username, u.avatar_url, u.oauth_provider,
            p.title as post_title
        FROM comments c
        JOIN users u ON u.id = c.user_id
        JOIN posts p ON p.id = c.post_id
        WHERE 1=1
    """
    params = []

    if status:
        query += " AND c.status = ?"
        params.append(status)

    if search:
        query += " AND c.content LIKE ? ESCAPE '\\'"
        params.append(f"%{_escape_like(search)}%")

    query += " ORDER BY c.created_at DESC LIMIT ? OFFSET ?"
    params.extend([limit, skip])

    cursor.execute(query, params)
    return [dict(row) for row in cursor.fetchall()]


def count_comments(conn: sqlite3.Connection, status: str = None, search: str = None) -> int:
    cursor = conn.cursor()
    query = "SELECT COUNT(*) FROM comments WHERE 1=1"
    params = []

    if status:
        query += " AND status = ?"
        params.append(status)

    if search:
        query += " AND content LIKE ? ESCAPE '\\'"
        params.append(f"%{_escape_like(search)}%")

    cursor.execute(query, params)
    return cursor.fetchone()[0]


def update_comment_status(conn: sqlite3.Connection, comment_id: int, status: str) -> bool:
    cursor = conn.cursor()
    cursor.execute("UPDATE comments SET status = ? WHERE id = ?", (status, comment_id))
    conn.commit()
    return cursor.rowcount > 0


def delete_comment_by_id(conn: sqlite3.Connection, comment_id: int) -> bool:
    """Delete a comment and its child comments.

    Uses explicit transaction for atomicity.
    """
    cursor = conn.cursor()
    try:
        # Delete child comments first, then the parent
        cursor.execute("DELETE FROM comments WHERE parent_id = ?", (comment_id,))
        cursor.execute("DELETE FROM comments WHERE id = ?", (comment_id,))
        conn.commit()
        return cursor.rowcount > 0
    except Exception:
        conn.rollback()
        raise


def batch_delete_comments(conn: sqlite3.Connection, comment_ids: list[int]) -> int:
    cursor = conn.cursor()
    placeholders = ",".join("?" * len(comment_ids))
    cursor.execute(f"DELETE FROM comments WHERE id IN ({placeholders})", comment_ids)
    conn.commit()
    return cursor.rowcount


def get_filters(conn: sqlite3.Connection) -> list[dict]:
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM comment_filters ORDER BY created_at DESC")
    return [dict(row) for row in cursor.fetchall()]


def add_filter(conn: sqlite3.Connection, filter_type: str, pattern: str, action: str = 'pending') -> dict:
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO comment_filters (filter_type, pattern, action) VALUES (?, ?, ?)",
        (filter_type, pattern, action)
    )
    conn.commit()
    return {"id": cursor.lastrowid, "filter_type": filter_type, "pattern": pattern, "action": action}


def delete_filter(conn: sqlite3.Connection, filter_id: int) -> bool:
    cursor = conn.cursor()
    cursor.execute("DELETE FROM comment_filters WHERE id = ?", (filter_id,))
    conn.commit()
    return cursor.rowcount > 0
