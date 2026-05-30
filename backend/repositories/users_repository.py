import sqlite3


def create_or_update_user(
    conn: sqlite3.Connection,
    oauth_provider: str,
    oauth_id: str,
    username: str,
    avatar_url: str = None,
    email: str = None,
) -> dict:
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO users (oauth_provider, oauth_id, username, avatar_url, email)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(oauth_provider, oauth_id) DO UPDATE SET
            username = excluded.username,
            avatar_url = excluded.avatar_url,
            email = excluded.email
        """,
        (oauth_provider, oauth_id, username, avatar_url, email),
    )
    conn.commit()
    cursor.execute(
        "SELECT id, oauth_provider, oauth_id, username, avatar_url, email, created_at FROM users WHERE oauth_provider = ? AND oauth_id = ?",
        (oauth_provider, oauth_id),
    )
    return dict(cursor.fetchone())


def get_user_by_oauth(
    conn: sqlite3.Connection,
    oauth_provider: str,
    oauth_id: str,
) -> dict | None:
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, oauth_provider, oauth_id, username, avatar_url, email, created_at FROM users WHERE oauth_provider = ? AND oauth_id = ?",
        (oauth_provider, oauth_id),
    )
    row = cursor.fetchone()
    return dict(row) if row else None


def get_user_by_id(conn: sqlite3.Connection, user_id: int) -> dict | None:
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, oauth_provider, oauth_id, username, avatar_url, email, created_at FROM users WHERE id = ?",
        (user_id,),
    )
    row = cursor.fetchone()
    return dict(row) if row else None


def get_users_with_stats(
    conn: sqlite3.Connection,
    skip: int = 0,
    limit: int = 20,
    search: str = None,
    provider: str = None,
) -> list[dict]:
    cursor = conn.cursor()
    query = """
        SELECT
            u.id,
            u.oauth_provider,
            u.oauth_id,
            u.username,
            u.avatar_url,
            u.email,
            u.created_at,
            COUNT(DISTINCT c.id) as comment_count,
            COUNT(DISTINCT f.id) as favorite_count
        FROM users u
        LEFT JOIN comments c ON c.user_id = u.id
        LEFT JOIN favorites f ON f.user_id = u.id
        WHERE u.oauth_provider != 'admin'
    """
    params = []
    if search:
        query += " AND (u.username LIKE ? OR u.email LIKE ?)"
        search_pattern = f"%{search}%"
        params.extend([search_pattern, search_pattern])
    if provider:
        query += " AND u.oauth_provider = ?"
        params.append(provider)
    query += " GROUP BY u.id ORDER BY u.created_at DESC LIMIT ? OFFSET ?"
    params.extend([limit, skip])
    cursor.execute(query, params)
    return [dict(row) for row in cursor.fetchall()]


def count_users(conn: sqlite3.Connection) -> int:
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM users WHERE oauth_provider != 'admin'")
    return cursor.fetchone()[0]


def get_user_stats(conn: sqlite3.Connection, user_id: int) -> dict:
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM comments WHERE user_id = ?", (user_id,))
    comment_count = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM favorites WHERE user_id = ?", (user_id,))
    favorite_count = cursor.fetchone()[0]
    return {"comment_count": comment_count, "favorite_count": favorite_count}


def get_user_active_days(conn: sqlite3.Connection, user_id: int) -> int:
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT COUNT(DISTINCT DATE(created_at)) FROM (
            SELECT created_at FROM comments WHERE user_id = ?
            UNION ALL
            SELECT created_at FROM favorites WHERE user_id = ?
        )
        """,
        (user_id, user_id),
    )
    return cursor.fetchone()[0]


def get_user_recent_comments(
    conn: sqlite3.Connection, user_id: int, limit: int = 5
) -> list[dict]:
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT c.id, c.post_id, c.content, c.created_at, p.title as post_title
        FROM comments c
        JOIN posts p ON p.id = c.post_id
        WHERE c.user_id = ?
        ORDER BY c.created_at DESC
        LIMIT ?
        """,
        (user_id, limit),
    )
    return [dict(row) for row in cursor.fetchall()]


def delete_user_cascade(conn: sqlite3.Connection, user_id: int) -> bool:
    cursor = conn.cursor()
    cursor.execute("SELECT oauth_provider FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    if not row:
        return False
    if row["oauth_provider"] == "admin":
        raise ValueError("Cannot delete admin account")
    cursor.execute("DELETE FROM comments WHERE user_id = ?", (user_id,))
    cursor.execute("DELETE FROM favorites WHERE user_id = ?", (user_id,))
    cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
    conn.commit()
    return True
