import sqlite3
import pytest
from services.favorites_service import toggle_favorite, is_favorited, get_user_favorites


@pytest.fixture
def db_conn():
    conn = sqlite3.connect(':memory:', check_same_thread=False)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute('''
        CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            oauth_provider TEXT NOT NULL,
            oauth_id TEXT NOT NULL,
            username TEXT NOT NULL,
            avatar_url TEXT,
            email TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(oauth_provider, oauth_id)
        )
    ''')

    cursor.execute('''
        CREATE TABLE posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            category TEXT,
            image_url TEXT,
            status TEXT DEFAULT 'published',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    cursor.execute('''
        CREATE TABLE favorites (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            post_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (post_id) REFERENCES posts(id),
            FOREIGN KEY (user_id) REFERENCES users(id),
            UNIQUE(post_id, user_id)
        )
    ''')

    cursor.execute(
        "INSERT INTO users (oauth_provider, oauth_id, username) VALUES (?, ?, ?)",
        ("github", "12345", "testuser"),
    )
    cursor.execute(
        "INSERT INTO users (oauth_provider, oauth_id, username) VALUES (?, ?, ?)",
        ("github", "67890", "otheruser"),
    )

    for i in range(5):
        cursor.execute(
            "INSERT INTO posts (title, content, status) VALUES (?, ?, ?)",
            (f"Post {i}", f"Content {i}", "published"),
        )

    conn.commit()
    yield conn
    conn.close()


def test_toggle_favorite_add(db_conn):
    result = toggle_favorite(db_conn, post_id=1, user_id=1)
    assert result is True

    cursor = db_conn.cursor()
    cursor.execute("SELECT * FROM favorites WHERE post_id = 1 AND user_id = 1")
    assert cursor.fetchone() is not None


def test_toggle_favorite_remove(db_conn):
    toggle_favorite(db_conn, post_id=1, user_id=1)
    result = toggle_favorite(db_conn, post_id=1, user_id=1)
    assert result is False

    cursor = db_conn.cursor()
    cursor.execute("SELECT * FROM favorites WHERE post_id = 1 AND user_id = 1")
    assert cursor.fetchone() is None


def test_toggle_favorite_independent_per_user(db_conn):
    toggle_favorite(db_conn, post_id=1, user_id=1)
    result = toggle_favorite(db_conn, post_id=1, user_id=2)
    assert result is True

    cursor = db_conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM favorites WHERE post_id = 1")
    assert cursor.fetchone()[0] == 2


def test_is_favorited_true(db_conn):
    toggle_favorite(db_conn, post_id=1, user_id=1)
    assert is_favorited(db_conn, post_id=1, user_id=1) is True


def test_is_favorited_false(db_conn):
    assert is_favorited(db_conn, post_id=1, user_id=1) is False


def test_get_user_favorites(db_conn):
    toggle_favorite(db_conn, post_id=1, user_id=1)
    toggle_favorite(db_conn, post_id=3, user_id=1)
    toggle_favorite(db_conn, post_id=5, user_id=1)

    favorites = get_user_favorites(db_conn, user_id=1)
    assert len(favorites) == 3
    post_ids = {f["post_id"] for f in favorites}
    assert post_ids == {1, 3, 5}


def test_get_user_favorites_with_pagination(db_conn):
    for i in range(1, 6):
        toggle_favorite(db_conn, post_id=i, user_id=1)

    page1 = get_user_favorites(db_conn, user_id=1, skip=0, limit=2)
    assert len(page1) == 2

    page2 = get_user_favorites(db_conn, user_id=1, skip=2, limit=2)
    assert len(page2) == 2

    page3 = get_user_favorites(db_conn, user_id=1, skip=4, limit=2)
    assert len(page3) == 1


def test_get_user_favorites_empty(db_conn):
    favorites = get_user_favorites(db_conn, user_id=1)
    assert favorites == []


def test_get_user_favorites_excludes_other_users(db_conn):
    toggle_favorite(db_conn, post_id=1, user_id=1)
    toggle_favorite(db_conn, post_id=2, user_id=2)

    favorites = get_user_favorites(db_conn, user_id=1)
    assert len(favorites) == 1
    assert favorites[0]["post_id"] == 1
