import sqlite3
import pytest
from fastapi.testclient import TestClient
from main import app
from database import get_db


def test_search_endpoint_returns_matching_posts():
    """Test that search endpoint returns posts matching query"""
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
    CREATE TABLE search_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        query TEXT NOT NULL,
        user_ip TEXT,
        searched_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    cursor.execute('''
    INSERT INTO posts (title, content, category)
    VALUES ('React Tutorial', 'Learn React basics', 'Tech')
    ''')
    cursor.execute('''
    INSERT INTO posts (title, content, category)
    VALUES ('Python Guide', 'Python programming guide', 'Programming')
    ''')
    cursor.execute('''
    INSERT INTO posts (title, content, category)
    VALUES ('Design Patterns', 'Software design patterns', 'Tech')
    ''')
    conn.commit()

    def override_get_db():
        try:
            yield conn
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    client = TestClient(app)

    response = client.get("/api/posts/search?q=React")
    assert response.status_code == 200
    data = response.json()
    assert len(data['results']) == 1
    assert data['results'][0]['title'] == 'React Tutorial'

    response = client.get("/api/posts/search?q=programming")
    assert response.status_code == 200
    data = response.json()
    assert len(data['results']) == 1
    assert data['results'][0]['title'] == 'Python Guide'

    response = client.get("/api/posts/search?q=Tech")
    assert response.status_code == 200
    data = response.json()
    assert len(data['results']) == 2

    app.dependency_overrides.clear()
    conn.close()


def test_search_empty_query_returns_empty():
    """Empty search query should return empty results, not all posts."""
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
    CREATE TABLE search_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        query TEXT NOT NULL,
        user_ip TEXT,
        searched_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    cursor.execute('''
    INSERT INTO posts (title, content, category)
    VALUES ('React Tutorial', 'Learn React basics', 'Tech')
    ''')
    conn.commit()

    def override_get_db():
        try:
            yield conn
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    client = TestClient(app)

    resp = client.get("/api/posts/search?q=")
    assert resp.status_code == 200
    data = resp.json()
    assert data["results"] == []
    assert data["total"] == 0

    app.dependency_overrides.clear()
    conn.close()


def test_search_single_char_returns_empty():
    """Single character query should return empty results."""
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
    CREATE TABLE search_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        query TEXT NOT NULL,
        user_ip TEXT,
        searched_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    cursor.execute('''
    INSERT INTO posts (title, content, category)
    VALUES ('React Tutorial', 'Learn React basics', 'Tech')
    ''')
    conn.commit()

    def override_get_db():
        try:
            yield conn
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    client = TestClient(app)

    resp = client.get("/api/posts/search?q=a")
    assert resp.status_code == 200
    data = resp.json()
    assert data["results"] == []
    assert data["total"] == 0

    app.dependency_overrides.clear()
    conn.close()
