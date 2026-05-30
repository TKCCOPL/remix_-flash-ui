import sqlite3
import pytest
from database import init_db, DB_FILE
from repositories.users_repository import create_or_update_user
from repositories.posts_repository import create_post as create_post_repo
from services.comments_service import (
    create_comment,
    get_comments_by_post,
    delete_comment,
    MAX_COMMENT_LENGTH,
)


@pytest.fixture
def db_conn():
    init_db()
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    conn.execute("DELETE FROM comments")
    conn.execute("DELETE FROM posts")
    conn.execute("DELETE FROM users")
    conn.commit()
    yield conn
    conn.execute("DELETE FROM comments")
    conn.execute("DELETE FROM posts")
    conn.execute("DELETE FROM users")
    conn.commit()
    conn.close()


def _create_user(conn, oauth_id="1", username="user"):
    return create_or_update_user(conn, "github", oauth_id, username)


def _create_post(conn, title="Test Post", content="content"):
    return create_post_repo(conn, title, content, None, None)


def test_create_comment(db_conn):
    user = _create_user(db_conn)
    post_id = _create_post(db_conn)
    comment = create_comment(db_conn, post_id, user["id"], "Hello world")
    assert comment["content"] == "Hello world"
    assert comment["post_id"] == post_id
    assert comment["user_id"] == user["id"]
    assert comment["status"] == "approved"


def test_get_comments_by_post(db_conn):
    user = _create_user(db_conn)
    post_id = _create_post(db_conn)
    create_comment(db_conn, post_id, user["id"], "Comment 1")
    create_comment(db_conn, post_id, user["id"], "Comment 2")
    comments = get_comments_by_post(db_conn, post_id)
    assert len(comments) == 2
    assert comments[0]["content"] == "Comment 2"
    assert comments[1]["content"] == "Comment 1"


def test_delete_comment(db_conn):
    user = _create_user(db_conn)
    post_id = _create_post(db_conn)
    comment = create_comment(db_conn, post_id, user["id"], "Delete me")
    result = delete_comment(db_conn, comment["id"], user["id"])
    assert result is True
    remaining = get_comments_by_post(db_conn, post_id)
    assert len(remaining) == 0


def test_delete_other_users_comment(db_conn):
    user1 = _create_user(db_conn, oauth_id="1", username="user1")
    user2 = _create_user(db_conn, oauth_id="2", username="user2")
    post_id = _create_post(db_conn)
    comment = create_comment(db_conn, post_id, user1["id"], "User1 comment")
    result = delete_comment(db_conn, comment["id"], user2["id"])
    assert result is False
    remaining = get_comments_by_post(db_conn, post_id)
    assert len(remaining) == 1


def test_content_too_long(db_conn):
    user = _create_user(db_conn)
    post_id = _create_post(db_conn)
    long_content = "x" * (MAX_COMMENT_LENGTH + 1)
    with pytest.raises(ValueError, match="too long"):
        create_comment(db_conn, post_id, user["id"], long_content)
