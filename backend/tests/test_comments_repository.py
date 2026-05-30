import pytest
import sqlite3
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import init_db, DB_FILE
from repositories.comments_repository import (
    create_comment_record,
    get_comment_by_id,
    get_comments_by_post_id,
)


@pytest.fixture(autouse=True)
def setup_db():
    init_db()
    yield
    if os.path.exists(DB_FILE):
        os.remove(DB_FILE)


def test_create_comment_with_parent_id():
    """Test creating a comment with parent_id."""
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row

    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO users (oauth_provider, oauth_id, username) VALUES (?, ?, ?)",
        ("github", "123", "testuser"),
    )
    user_id = cursor.lastrowid

    cursor.execute(
        "INSERT INTO posts (title, content) VALUES (?, ?)",
        ("Test Post", "Test content"),
    )
    post_id = cursor.lastrowid
    conn.commit()

    parent_id = create_comment_record(conn, post_id, user_id, "Parent comment")

    reply_id = create_comment_record(conn, post_id, user_id, "Reply", parent_id=parent_id)
    reply = get_comment_by_id(conn, reply_id)

    assert reply["parent_id"] == parent_id
    conn.close()


def test_get_comments_with_replies():
    """Test getting comments returns nested structure."""
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row

    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO users (oauth_provider, oauth_id, username) VALUES (?, ?, ?)",
        ("github", "123", "testuser"),
    )
    user_id = cursor.lastrowid

    cursor.execute(
        "INSERT INTO posts (title, content) VALUES (?, ?)",
        ("Test Post", "Test content"),
    )
    post_id = cursor.lastrowid
    conn.commit()

    parent_id = create_comment_record(conn, post_id, user_id, "Parent")
    create_comment_record(conn, post_id, user_id, "Reply", parent_id=parent_id)

    comments = get_comments_by_post_id(conn, post_id)

    assert len(comments) == 1
    assert len(comments[0]["replies"]) == 1
    assert comments[0]["replies"][0]["content"] == "Reply"
    conn.close()


def test_get_comments_without_parent():
    """Test getting comments without parent returns flat list."""
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row

    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO users (oauth_provider, oauth_id, username) VALUES (?, ?, ?)",
        ("github", "123", "testuser"),
    )
    user_id = cursor.lastrowid

    cursor.execute(
        "INSERT INTO posts (title, content) VALUES (?, ?)",
        ("Test Post", "Test content"),
    )
    post_id = cursor.lastrowid
    conn.commit()

    create_comment_record(conn, post_id, user_id, "Comment 1")
    create_comment_record(conn, post_id, user_id, "Comment 2")

    comments = get_comments_by_post_id(conn, post_id)

    assert len(comments) == 2
    assert len(comments[0]["replies"]) == 0
    assert len(comments[1]["replies"]) == 0
    conn.close()


def test_get_comment_by_id_returns_parent_id():
    """Test get_comment_by_id includes parent_id field."""
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row

    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO users (oauth_provider, oauth_id, username) VALUES (?, ?, ?)",
        ("github", "123", "testuser"),
    )
    user_id = cursor.lastrowid

    cursor.execute(
        "INSERT INTO posts (title, content) VALUES (?, ?)",
        ("Test Post", "Test content"),
    )
    post_id = cursor.lastrowid
    conn.commit()

    comment_id = create_comment_record(conn, post_id, user_id, "Test comment")
    comment = get_comment_by_id(conn, comment_id)

    assert comment is not None
    assert comment["parent_id"] is None
    assert comment["content"] == "Test comment"
    conn.close()
