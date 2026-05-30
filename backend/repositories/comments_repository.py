def create_comment_record(conn, post_id: int, user_id: int, content: str, status: str = "approved"):
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO comments (post_id, user_id, content, status, created_at)
        VALUES (?, ?, ?, ?, datetime('now', 'localtime'))
        """,
        (post_id, user_id, content, status),
    )
    conn.commit()
    return cursor.lastrowid


def get_comment_by_id(conn, comment_id: int):
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT id, post_id, user_id, content, status, created_at
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
        SELECT c.id, c.post_id, c.user_id, c.content, c.status, c.created_at,
               u.username, u.avatar_url
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.post_id = ? AND c.status = 'approved'
        ORDER BY c.created_at DESC
        LIMIT ? OFFSET ?
        """,
        (post_id, limit, skip),
    )
    return [dict(row) for row in cursor.fetchall()]


def delete_comment_record(conn, comment_id: int):
    cursor = conn.cursor()
    cursor.execute("DELETE FROM comments WHERE id = ?", (comment_id,))
    conn.commit()
    return cursor.rowcount > 0


def get_comment_count_by_post(conn, post_id: int):
    cursor = conn.cursor()
    cursor.execute(
        "SELECT COUNT(*) as count FROM comments WHERE post_id = ? AND status = 'approved'",
        (post_id,),
    )
    return cursor.fetchone()["count"]
