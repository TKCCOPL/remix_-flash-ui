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
        status TEXT DEFAULT 'published',
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
    INSERT INTO categories (name, slug, description)
    VALUES ('Tech', 'tech', 'Technology posts')
    ''')
    cursor.execute('''
    INSERT INTO categories (name, slug, description)
    VALUES ('Design', 'design', 'Design posts')
    ''')
    
    for _ in range(5):
        cursor.execute("INSERT INTO posts (title, content, category, status) VALUES ('T', 'C', 'Tech', 'published')")
    for _ in range(3):
        cursor.execute("INSERT INTO posts (title, content, category, status) VALUES ('T', 'C', 'Design', 'published')")
    
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


def test_category_posts_excludes_drafts():
    """Draft posts should not appear in category post list."""
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
    CREATE TABLE categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        slug TEXT NOT NULL UNIQUE,
        description TEXT,
        post_count INTEGER DEFAULT 0
    )
    ''')

    cursor.execute("INSERT INTO categories (name, slug, description) VALUES ('Tech', 'tech', 'Technology posts')")
    cursor.execute("INSERT INTO posts (title, content, category, status) VALUES ('Draft Post', 'Draft content', 'Tech', 'draft')")
    cursor.execute("INSERT INTO posts (title, content, category, status) VALUES ('Published Post', 'Published content', 'Tech', 'published')")
    conn.commit()

    def override_get_db():
        try:
            yield conn
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    client = TestClient(app)
    response = client.get("/api/categories/tech/posts")

    assert response.status_code == 200
    data = response.json()
    titles = [p["title"] for p in data["posts"]]
    assert "Published Post" in titles
    assert "Draft Post" not in titles

    app.dependency_overrides.clear()
    conn.close()
