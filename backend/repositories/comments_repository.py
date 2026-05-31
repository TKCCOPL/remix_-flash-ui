import sqlite3


def create_comment_record(conn, post_id: int, user_id: int, content: str, status: str = "approved", parent_id: int = None):
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO comments (post_id, user_id, content, status, parent_id, created_at)
        VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'))
        """,
        (post_id, user_id, content, status, parent_id),
    )
    conn.commit()
    return cursor.lastrowid


def get_comment_by_id(conn, comment_id: int):
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT id, post_id, user_id, content, status, parent_id, created_at
        FROM comments
        WHERE id = ?
        """,
        (comment_id,),
    )
    row = cursor.fetchone()
    return dict(row) if row else None


def get_comments_by_post_id(conn, post_id: int, skip: int = 0, limit: int = 20):
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT c.id, c.post_id, c.user_id, c.content, c.status, c.parent_id, c.created_at,
               u.username, u.avatar_url, u.oauth_provider
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.post_id = ? AND c.status = 'approved'
        ORDER BY c.created_at DESC
        """,
        (post_id,),
    )
    all_comments = [dict(row) for row in cursor.fetchall()]

    comment_map = {c["id"]: {**c, "replies": []} for c in all_comments}
    top_level = []

    for comment in all_comments:
        comment_with_replies = comment_map[comment["id"]]
        if comment["parent_id"] and comment["parent_id"] in comment_map:
            comment_map[comment["parent_id"]]["replies"].append(comment_with_replies)
        else:
            top_level.append(comment_with_replies)

    return top_level[skip:skip + limit]


def delete_comment_record(conn, comment_id: int):
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


def get_comment_count_by_post(conn, post_id: int):
    cursor = conn.cursor()
    cursor.execute(
        "SELECT COUNT(*) as count FROM comments WHERE post_id = ? AND status = 'approved'",
        (post_id,),
    )
    return cursor.fetchone()["count"]


def get_comments_by_user_id(conn: sqlite3.Connection, user_id: int, skip: int = 0, limit: int = 20) -> list[dict]:
    """Get comments by user id with post info."""
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT c.id, c.post_id, c.content, c.created_at, p.title as post_title
        FROM comments c
        JOIN posts p ON c.post_id = p.id
        WHERE c.user_id = ? AND c.status = 'approved'
        ORDER BY c.created_at DESC
        LIMIT ? OFFSET ?
        """,
        (user_id, limit, skip),
    )
    return [dict(row) for row in cursor.fetchall()]
