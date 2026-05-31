import sqlite3
import os

DB_FILE = 'data/blog.sqlite3'

def seed_database():
    """Seed database with test data if empty."""
    from seed import seed_database as _seed
    _seed()

def get_db():
    conn = sqlite3.connect(DB_FILE, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
    finally:
        conn.close()

def init_db():
    os.makedirs('data', exist_ok=True)
    conn = sqlite3.connect(DB_FILE)
    # Enable foreign keys for this connection (must be per-connection)
    # Best practice: https://www.sqlite.org/foreignkeys.html
    conn.execute("PRAGMA foreign_keys = ON")
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
    if "view_count" not in column_names:
        cursor.execute("ALTER TABLE posts ADD COLUMN view_count INTEGER DEFAULT 0")

    # ── OAuth guest tables ──────────────────────────────────────────────────
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS oauth_states (
        state TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
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
    CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        status TEXT DEFAULT 'approved',
        parent_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS favorites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(post_id, user_id)
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS comment_filters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filter_type TEXT NOT NULL,
        pattern TEXT NOT NULL,
        action TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    # Add missing database indexes after column backfill
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_posts_status ON posts (status)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts (created_at DESC)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories (slug)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_users_oauth ON users(oauth_provider, oauth_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id, status, created_at)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id)')

    # Check if parent_id column exists for migration (for existing databases)
    cursor.execute("PRAGMA table_info(comments)")
    comment_columns = {row[1] for row in cursor.fetchall()}
    if "parent_id" not in comment_columns:
        # For existing databases, add parent_id without CASCADE (SQLite limitation)
        # New databases will have ON DELETE CASCADE from CREATE TABLE
        cursor.execute("ALTER TABLE comments ADD COLUMN parent_id INTEGER REFERENCES comments(id)")

    cursor.execute('CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_favorites_post ON favorites(post_id)')
    conn.commit()
    conn.close()

    # Seed database with test data if empty
    seed_database()
