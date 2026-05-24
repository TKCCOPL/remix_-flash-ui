import sqlite3
import pytest
from fastapi.testclient import TestClient
from main import app
from database import get_db


def test_archive_endpoint_returns_grouped_posts():
    """Test that archive endpoint returns posts grouped by year and month"""
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
    INSERT INTO posts (title, content, created_at)
    VALUES ('Test Post 1', 'Content 1', '2024-12-15 10:00:00')
    ''')
    cursor.execute('''
    INSERT INTO posts (title, content, created_at)
    VALUES ('Test Post 2', 'Content 2', '2024-11-20 10:00:00')
    ''')
    cursor.execute('''
    INSERT INTO posts (title, content, created_at)
    VALUES ('Test Post 3', 'Content 3', '2023-10-05 10:00:00')
    ''')
    conn.commit()

    def override_get_db():
        try:
            yield conn
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    client = TestClient(app)
    response = client.get("/api/posts/archive")

    assert response.status_code == 200
    data = response.json()

    assert "2024" in data
    assert "2023" in data
    assert len(data["2024"]) == 2
    assert len(data["2023"]) == 1

    app.dependency_overrides.clear()
    conn.close()
