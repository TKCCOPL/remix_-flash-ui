"""Repository for revoked token persistence."""

import sqlite3


def add_revoked_token(conn: sqlite3.Connection, jti: str, token_type: str, expires_at: int) -> None:
    """Add a revoked token to the database."""
    cursor = conn.cursor()
    cursor.execute(
        "INSERT OR REPLACE INTO revoked_tokens (jti, token_type, expires_at) VALUES (?, ?, ?)",
        (jti, token_type, expires_at),
    )
    conn.commit()


def is_token_revoked(conn: sqlite3.Connection, jti: str) -> bool:
    """Check if a token has been revoked."""
    cursor = conn.cursor()
    cursor.execute("SELECT 1 FROM revoked_tokens WHERE jti = ?", (jti,))
    return cursor.fetchone() is not None


def prune_expired_tokens(conn: sqlite3.Connection) -> int:
    """Remove expired revoked tokens. Returns number of removed rows."""
    import time
    cursor = conn.cursor()
    cursor.execute("DELETE FROM revoked_tokens WHERE expires_at < ?", (int(time.time()),))
    conn.commit()
    return cursor.rowcount
