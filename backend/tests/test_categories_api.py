import sqlite3
import pytest
from fastapi.testclient import TestClient
from main import app
from database import get_db


def test_categories_endpoint_returns_all_categories():
    """Test that categories endpoint returns all categories with post counts"""
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    cursor.execute('''
    CREATE TABLE categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        slug TEXT NOT NULL UNIQUE,
        description TEXT,
        post_count INTEGER DEFAULT 0
    )
    ''')

    cursor.execute('''
    INSERT INTO categories (name, slug, description, post_count)
    VALUES ('Tech', 'tech', 'Technology posts', 5)
    ''')
    cursor.execute('''
    INSERT INTO categories (name, slug, description, post_count)
    VALUES ('Design', 'design', 'Design posts', 3)
    ''')
    conn.commit()

    def override_get_db():
        try:
            yield conn
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    client = TestClient(app)
    response = client.get("/api/categories")

    assert response.status_code == 200
    data = response.json()

    assert len(data) == 2
    assert data[0]['name'] == 'Tech'
    assert data[0]['post_count'] == 5
    assert data[1]['name'] == 'Design'
    assert data[1]['post_count'] == 3

    app.dependency_overrides.clear()
    conn.close()
