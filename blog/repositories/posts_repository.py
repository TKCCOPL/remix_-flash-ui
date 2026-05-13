def get_posts(conn, skip: int = 0, limit: int = 10):
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT id, title, content, category, image_url, created_at, updated_at
        FROM posts
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
        """,
        (limit, skip),
    )
    return [dict(row) for row in cursor.fetchall()]


def get_post(conn, post_id: int):
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT id, title, content, category, image_url, created_at, updated_at
        FROM posts
        WHERE id = ?
        """,
        (post_id,),
    )
    row = cursor.fetchone()
    return dict(row) if row else None


def create_post(conn, title: str, content: str, category: str | None, image_url: str | None):
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO posts (title, content, category, image_url, created_at, updated_at)
        VALUES (?, ?, ?, ?, datetime('now', 'localtime'), datetime('now', 'localtime'))
        """,
        (title, content, category, image_url),
    )
    conn.commit()
    return cursor.lastrowid


def update_post(conn, post_id: int, title: str | None, content: str | None, category: str | None, image_url: str | None):
    cursor = conn.cursor()
    cursor.execute(
        """
        UPDATE posts
        SET title = COALESCE(?, title),
            content = COALESCE(?, content),
            category = COALESCE(?, category),
            image_url = COALESCE(?, image_url),
            updated_at = datetime('now', 'localtime')
        WHERE id = ?
        """,
        (title, content, category, image_url, post_id),
    )
    conn.commit()
    return cursor.rowcount > 0


def delete_post(conn, post_id: int):
    cursor = conn.cursor()
    cursor.execute("DELETE FROM posts WHERE id = ?", (post_id,))
    conn.commit()
    return cursor.rowcount > 0
