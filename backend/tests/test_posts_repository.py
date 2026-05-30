import pytest
import sqlite3
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import init_db, DB_FILE
from repositories.posts_repository import (
    increment_view_count,
    get_post,
    get_post_with_stats,
)


@pytest.fixture(autouse=True)
def setup_db():
    init_db()
    yield
    if os.path.exists(DB_FILE):
        os.remove(DB_FILE)


def _create_post(cursor, title="Test Post", content="Test content"):
    cursor.execute(
        "INSERT INTO posts (title, content, status) VALUES (?, ?, 'published')",
        (title, content),
    )
    return cursor.lastrowid


def _create_user(cursor, provider="github", oauth_id="123", username="testuser"):
    cursor.execute(
        "INSERT INTO users (oauth_provider, oauth_id, username) VALUES (?, ?, ?)",
        (provider, oauth_id, username),
    )
    return cursor.lastrowid


def test_increment_view_count():
    """Test incrementing view count."""
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row

    cursor = conn.cursor()
    post_id = _create_post(cursor)
    conn.commit()

    increment_view_count(conn, post_id)
    post = get_post(conn, post_id)
    assert post["view_count"] == 1

    increment_view_count(conn, post_id)
    post = get_post(conn, post_id)
    assert post["view_count"] == 2
    conn.close()


def test_get_post_with_stats():
    """Test getting post with comment and favorite counts."""
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row

    cursor = conn.cursor()
    post_id = _create_post(cursor)
    user_id = _create_user(cursor)
    conn.commit()

    cursor.execute(
        "INSERT INTO comments (post_id, user_id, content, status) VALUES (?, ?, ?, 'approved')",
        (post_id, user_id, "Nice post"),
    )
    cursor.execute(
        "INSERT INTO comments (post_id, user_id, content, status) VALUES (?, ?, ?, 'pending')",
        (post_id, user_id, "Pending comment"),
    )
    cursor.execute(
        "INSERT INTO favorites (post_id, user_id) VALUES (?, ?)",
        (post_id, user_id),
    )
    conn.commit()

    post = get_post_with_stats(conn, post_id)
    assert post is not None
    assert "comment_count" in post
    assert "favorite_count" in post
    assert post["comment_count"] == 1
    assert post["favorite_count"] == 1
    conn.close()


def test_get_post_with_stats_no_comments_or_favorites():
    """Test stats return zero when no comments or favorites exist."""
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row

    cursor = conn.cursor()
    post_id = _create_post(cursor)
    conn.commit()

    post = get_post_with_stats(conn, post_id)
    assert post["comment_count"] == 0
    assert post["favorite_count"] == 0
    conn.close()


def test_get_post_with_stats_nonexistent():
    """Test getting stats for nonexistent post returns None."""
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row

    post = get_post_with_stats(conn, 9999)
    assert post is None
    conn.close()
