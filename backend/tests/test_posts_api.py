import sqlite3
import pytest
from fastapi.testclient import TestClient
from main import app
from database import get_db


def _create_likes_table(cursor):
    """Create the likes and view_logs tables in test in-memory databases."""
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS likes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        post_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, post_id)
    )
    ''')
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS view_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        user_ip_hash TEXT NOT NULL,
        viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    ''')


def test_list_posts_endpoint():
    """Test that the list posts endpoint returns correctly formatted posts"""
    conn = sqlite3.connect(':memory:', check_same_thread=False)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
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
    _create_likes_table(cursor)
    cursor.execute('''
    INSERT INTO posts (title, content, category)
    VALUES ('Typography Test', '# Hello World', 'Design')
    ''')
    conn.commit()

    def override_get_db():
        try:
            yield conn
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    client = TestClient(app)
    response = client.get("/api/posts")

    assert response.status_code == 200
    data = response.json()
    
    assert len(data) == 1
    assert data[0]["title"] == "Typography Test"
    assert data[0]["category"] == "Design"

    app.dependency_overrides.clear()
    conn.close()


def test_get_single_post_endpoint():
    """Test that retrieving a single post works correctly"""
    conn = sqlite3.connect(':memory:', check_same_thread=False)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute('''
    CREATE TABLE posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT,
        image_url TEXT,
        status TEXT DEFAULT 'published',
        view_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    cursor.execute('''
    CREATE TABLE comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        user_id INTEGER,
        content TEXT NOT NULL,
        status TEXT DEFAULT 'approved',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    cursor.execute('''
    CREATE TABLE favorites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        user_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    _create_likes_table(cursor)
    cursor.execute('''
    INSERT INTO posts (title, content, category)
    VALUES ('Typography Test', '# Hello World', 'Design')
    ''')
    conn.commit()

    def override_get_db():
        try:
            yield conn
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    client = TestClient(app)

    # 存在的情况
    response = client.get("/api/posts/1")
    assert response.status_code == 200
    assert response.json()["title"] == "Typography Test"

    # 不存在的情况
    response_404 = client.get("/api/posts/999")
    assert response_404.status_code == 404

    app.dependency_overrides.clear()
    conn.close()


def test_post_out_has_stats_fields():
    """Test PostOut schema has view_count, comment_count, favorite_count, like_count."""
    from schemas import PostOut

    post = PostOut(
        id=1,
        title="Test",
        content="Content",
        category=None,
        status="published",
        created_at="2024-01-01",
        updated_at="2024-01-01",
        view_count=10,
        comment_count=5,
        favorite_count=3,
        like_count=7,
    )
    assert post.view_count == 10
    assert post.comment_count == 5
    assert post.favorite_count == 3
    assert post.like_count == 7


def test_get_post_increments_view_count():
    """Test that getting a post increments view count, with anti-abuse cooldown."""
    conn = sqlite3.connect(':memory:', check_same_thread=False)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute('''
    CREATE TABLE posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT,
        image_url TEXT,
        status TEXT DEFAULT 'published',
        view_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    cursor.execute('''
    CREATE TABLE comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        user_id INTEGER,
        content TEXT NOT NULL,
        status TEXT DEFAULT 'approved',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    cursor.execute('''
    CREATE TABLE favorites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        user_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    _create_likes_table(cursor)
    cursor.execute('''
    INSERT INTO posts (title, content, category)
    VALUES ('Typography Test', '# Hello World', 'Design')
    ''')
    conn.commit()

    def override_get_db():
        try:
            yield conn
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    client = TestClient(app)
    # First request increments view_count
    client.get("/api/posts/1")
    # Second request from same IP within 10 min is blocked by anti-abuse cooldown
    response = client.get("/api/posts/1")
    data = response.json()
    assert data["view_count"] == 1

    app.dependency_overrides.clear()
    conn.close()


def test_get_post_returns_stats():
    """Test that getting a post returns stats."""
    conn = sqlite3.connect(':memory:', check_same_thread=False)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute('''
    CREATE TABLE posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT,
        image_url TEXT,
        status TEXT DEFAULT 'published',
        view_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    cursor.execute('''
    CREATE TABLE comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        user_id INTEGER,
        content TEXT NOT NULL,
        status TEXT DEFAULT 'approved',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    cursor.execute('''
    CREATE TABLE favorites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        user_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    _create_likes_table(cursor)
    cursor.execute('''
    INSERT INTO posts (title, content, category)
    VALUES ('Typography Test', '# Hello World', 'Design')
    ''')
    conn.commit()

    def override_get_db():
        try:
            yield conn
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    client = TestClient(app)
    response = client.get("/api/posts/1")
    data = response.json()
    assert "view_count" in data
    assert "comment_count" in data
    assert "favorite_count" in data

    app.dependency_overrides.clear()
    conn.close()
