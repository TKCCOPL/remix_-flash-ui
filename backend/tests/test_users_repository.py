import sqlite3
import pytest
from database import init_db, DB_FILE
from repositories.users_repository import (
    create_or_update_user,
    get_user_by_oauth,
    get_user_by_id,
)

@pytest.fixture
def db_conn():
    init_db()
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    yield conn
    conn.execute("DELETE FROM users")
    conn.commit()
    conn.close()

def test_create_user(db_conn):
    user = create_or_update_user(
        db_conn,
        oauth_provider="github",
        oauth_id="12345",
        username="testuser",
        avatar_url="https://example.com/avatar.png",
        email="test@example.com",
    )
    assert user["id"] is not None
    assert user["username"] == "testuser"

def test_update_existing_user(db_conn):
    create_or_update_user(db_conn, oauth_provider="github", oauth_id="12345", username="oldname", avatar_url="https://old.com/avatar.png")
    user = create_or_update_user(db_conn, oauth_provider="github", oauth_id="12345", username="newname", avatar_url="https://new.com/avatar.png")
    assert user["username"] == "newname"
    assert user["avatar_url"] == "https://new.com/avatar.png"

def test_get_user_by_oauth(db_conn):
    create_or_update_user(db_conn, oauth_provider="github", oauth_id="12345", username="testuser")
    user = get_user_by_oauth(db_conn, "github", "12345")
    assert user is not None
    assert user["username"] == "testuser"

def test_get_user_by_oauth_not_found(db_conn):
    user = get_user_by_oauth(db_conn, "github", "99999")
    assert user is None

def test_get_user_by_id(db_conn):
    created = create_or_update_user(db_conn, oauth_provider="github", oauth_id="12345", username="testuser")
    user = get_user_by_id(db_conn, created["id"])
    assert user is not None
    assert user["username"] == "testuser"

def test_get_user_by_id_not_found(db_conn):
    user = get_user_by_id(db_conn, 99999)
    assert user is None
