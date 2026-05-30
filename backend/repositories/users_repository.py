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
