import sqlite3
import pytest
from database import init_db, get_db


def test_categories_table_exists():
    """Test that categories table is created with correct schema"""
    conn = sqlite3.connect(':memory:')
    cursor = conn.cursor()

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        slug TEXT NOT NULL UNIQUE,
        description TEXT,
        post_count INTEGER DEFAULT 0
    )
    ''')

    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='categories'")
    result = cursor.fetchone()
    assert result is not None
    assert result[0] == 'categories'

    cursor.execute("PRAGMA table_info(categories)")
    columns = {row[1] for row in cursor.fetchall()}
    expected_columns = {'id', 'name', 'slug', 'description', 'post_count'}
    assert columns == expected_columns

    conn.close()


def test_search_logs_table_exists():
    """Test that search_logs table is created with correct schema"""
    conn = sqlite3.connect(':memory:')
    cursor = conn.cursor()

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS search_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        query TEXT NOT NULL,
        user_ip TEXT,
        searched_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='search_logs'")
    result = cursor.fetchone()
    assert result is not None
    assert result[0] == 'search_logs'

    cursor.execute("PRAGMA table_info(search_logs)")
    columns = {row[1] for row in cursor.fetchall()}
    expected_columns = {'id', 'query', 'user_ip', 'searched_at'}
    assert columns == expected_columns

    conn.close()
