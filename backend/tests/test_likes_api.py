import pytest
import sqlite3

def test_likes_table_exists():
    """Test that likes table is created on init"""
    from database import init_db

    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    init_db(conn)

    cursor = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='likes'"
    )
    assert cursor.fetchone() is not None
    conn.close()

def test_toggle_like_atomic():
    """Test toggle like returns True on insert, False on delete"""
    from repositories.likes_repository import toggle_like_atomic

    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    from database import init_db
    init_db(conn)

    # Insert a test user and post
    conn.execute("INSERT INTO users (oauth_provider, oauth_id, username) VALUES ('test', '1', 'testuser')")
    conn.execute("INSERT INTO posts (title, content, category) VALUES ('Test', 'Content', 'tech')")
    conn.commit()

    # First toggle should return True (liked)
    result = toggle_like_atomic(conn, user_id=1, post_id=1)
    assert result is True

    # Second toggle should return False (unliked)
    result = toggle_like_atomic(conn, user_id=1, post_id=1)
    assert result is False

    conn.close()
