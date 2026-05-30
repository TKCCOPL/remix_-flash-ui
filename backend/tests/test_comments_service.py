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
from services.auth_service import create_session_token


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


def test_create_reply_with_valid_parent(db_conn):
    user = _create_user(db_conn)
    post_id = _create_post(db_conn)
    parent = create_comment(db_conn, post_id, user["id"], "Parent comment")
    reply = create_comment(db_conn, post_id, user["id"], "Reply", parent_id=parent["id"])
    assert reply["content"] == "Reply"
    assert reply["parent_id"] == parent["id"]
    assert reply["post_id"] == post_id


def test_create_reply_with_invalid_parent(db_conn):
    user = _create_user(db_conn)
    post_id = _create_post(db_conn)
    with pytest.raises(ValueError, match="Parent comment not found"):
        create_comment(db_conn, post_id, user["id"], "Reply", parent_id=999)


def test_create_reply_to_different_post(db_conn):
    user = _create_user(db_conn)
    post1 = _create_post(db_conn, title="Post 1")
    post2 = _create_post(db_conn, title="Post 2")
    parent = create_comment(db_conn, post1, user["id"], "Parent on post 1")
    with pytest.raises(ValueError, match="different post"):
        create_comment(db_conn, post2, user["id"], "Reply on post 2", parent_id=parent["id"])


def test_create_reply_to_reply(db_conn):
    user = _create_user(db_conn)
    post_id = _create_post(db_conn)
    parent = create_comment(db_conn, post_id, user["id"], "Parent")
    reply = create_comment(db_conn, post_id, user["id"], "Reply", parent_id=parent["id"])
    with pytest.raises(ValueError, match="Cannot reply to a reply"):
        create_comment(db_conn, post_id, user["id"], "Reply to reply", parent_id=reply["id"])


# ── API-level tests ─────────────────────────────────────────────────────────


@pytest.fixture
def client():
    """Create a FastAPI TestClient with CSRF disabled for testing."""
    from fastapi.testclient import TestClient
    from main import app
    from middleware import CSRFMiddleware

    # Remove CSRF middleware for test simplicity
    app.user_middleware = [
        m for m in app.user_middleware
        if m.cls != CSRFMiddleware
    ]
    # Rebuild middleware stack
    app.middleware_stack = None

    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


@pytest.fixture
def sample_post(db_conn):
    """Create a sample post for API tests."""
    post_id = _create_post(db_conn, title="API Test Post", content="Test content")
    post = db_conn.execute("SELECT * FROM posts WHERE id = ?", (post_id,)).fetchone()
    return dict(post)


@pytest.fixture
def auth_headers(db_conn):
    """Create auth headers with a valid session cookie."""
    # Create a user in the database
    user = _create_user(db_conn, oauth_id="api_user", username="api_user")
    # Generate a session token
    token = create_session_token("api_user")
    return {"Cookie": f"session={token}"}


def test_create_comment_reply_to_reply_returns_400(client, auth_headers, sample_post):
    """Replying to a reply should return 400, not 500."""
    # Create parent comment
    resp1 = client.post(
        f"/api/posts/{sample_post['id']}/comments",
        json={"content": "Parent comment"},
        headers=auth_headers,
    )
    assert resp1.status_code == 200
    parent_id = resp1.json()["id"]

    # Create reply to parent
    resp2 = client.post(
        f"/api/posts/{sample_post['id']}/comments",
        json={"content": "Reply to parent", "parent_id": parent_id},
        headers=auth_headers,
    )
    assert resp2.status_code == 200
    reply_id = resp2.json()["id"]

    # Try to reply to reply (should fail with 400)
    resp3 = client.post(
        f"/api/posts/{sample_post['id']}/comments",
        json={"content": "Reply to reply", "parent_id": reply_id},
        headers=auth_headers,
    )
    assert resp3.status_code == 400
    assert "Cannot reply to a reply" in resp3.json()["detail"]


def test_create_comment_invalid_parent_returns_400(client, auth_headers, sample_post):
    """Non-existent parent comment should return 400."""
    resp = client.post(
        f"/api/posts/{sample_post['id']}/comments",
        json={"content": "Orphan reply", "parent_id": 99999},
        headers=auth_headers,
    )
    assert resp.status_code == 400
    assert "Parent comment not found" in resp.json()["detail"]
