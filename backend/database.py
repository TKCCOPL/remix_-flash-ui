import sqlite3
import os

DB_FILE = 'data/blog.sqlite3'

def get_db():
    conn = sqlite3.connect(DB_FILE, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

def init_db():
    os.makedirs('data', exist_ok=True)
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS posts (
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
    CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        slug TEXT NOT NULL UNIQUE,
        description TEXT,
        post_count INTEGER DEFAULT 0
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS search_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        query TEXT NOT NULL,
        user_ip TEXT,
        searched_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    cursor.execute("PRAGMA table_info(posts)")
    column_names = {row[1] for row in cursor.fetchall()}
    if "image_url" not in column_names:
        cursor.execute("ALTER TABLE posts ADD COLUMN image_url TEXT")
    if "status" not in column_names:
        cursor.execute("ALTER TABLE posts ADD COLUMN status TEXT DEFAULT 'published'")

    # 修复：添加缺失的数据库索引（在列补充之后）
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_posts_status ON posts (status)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts (created_at DESC)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories (slug)')
    conn.commit()
    conn.close()
