"""Tests for admin comment repository LIKE escaping."""
import sqlite3
import pytest
from repositories.comments_admin_repository import get_comments_with_filter, count_comments


@pytest.fixture
def db():
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    conn.execute("""
        CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT, avatar_url TEXT, oauth_provider TEXT)
    """)
    conn.execute("""
        CREATE TABLE posts (id INTEGER PRIMARY KEY, title TEXT)
    """)
    conn.execute("""
        CREATE TABLE comments (
            id INTEGER PRIMARY KEY, post_id INTEGER, user_id INTEGER,
            content TEXT, status TEXT, parent_id INTEGER, created_at TEXT,
            FOREIGN KEY (post_id) REFERENCES posts(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)
    conn.execute("INSERT INTO users VALUES (1, 'test', NULL, 'github')")
    conn.execute("INSERT INTO posts VALUES (1, 'Test Post')")
    conn.execute("INSERT INTO comments VALUES (1, 1, 1, 'Hello world', 'approved', NULL, '2024-01-01')")
    conn.execute("INSERT INTO comments VALUES (2, 1, 1, '100% great', 'approved', NULL, '2024-01-02')")
    conn.execute("INSERT INTO comments VALUES (3, 1, 1, 'test_value', 'approved', NULL, '2024-01-03')")
    conn.commit()
    yield conn
    conn.close()


def test_search_percent_sign_matches_only_percent(db):
    """Searching for '%' should only match comments containing literal '%', not all comments."""
    results = get_comments_with_filter(db, search="%")
    contents = [r["content"] for r in results]
    assert "100% great" in contents
    assert "Hello world" not in contents
    assert "test_value" not in contents


def test_search_underscore_matches_only_underscore(db):
    """Searching for '_' should only match comments containing literal '_', not all comments."""
    results = get_comments_with_filter(db, search="_")
    contents = [r["content"] for r in results]
    assert "test_value" in contents
    assert "Hello world" not in contents
    assert "100% great" not in contents


def test_count_comments_with_search(db):
    """count_comments should respect search filter."""
    total = count_comments(db, search="%")
    assert total == 1  # Only "100% great"
