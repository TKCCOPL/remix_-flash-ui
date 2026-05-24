import sqlite3
import pytest
from fastapi.testclient import TestClient
from main import app
from database import get_db


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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    ''')
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
