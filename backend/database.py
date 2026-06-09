import sqlite3
import os
from pathlib import Path

DB_FILE = str(Path(__file__).parent / 'data' / 'blog.sqlite3')

def seed_database():
    """Seed database with test data if empty. Skipped in production."""
    if os.environ.get("ENVIRONMENT") == "production":
        return
    from seed import seed_database as _seed
    _seed()

def get_db():
    conn = sqlite3.connect(DB_FILE, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")  # Better concurrent read performance
    try:
        yield conn
    finally:
        conn.close()

def init_db(conn_param=None):
    if conn_param is not None:
        conn = conn_param
    else:
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

    # ── OAuth PKCE migration ────────────────────────────────────────────────
    cursor.execute("PRAGMA table_info(oauth_states)")
    oauth_columns = {row[1] for row in cursor.fetchall()}
    if "code_verifier" not in oauth_columns:
        cursor.execute("ALTER TABLE oauth_states ADD COLUMN code_verifier TEXT")

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

    # ── Role column migration ───────────────────────────────────────────────
    cursor.execute("PRAGMA table_info(users)")
    users_columns = {row[1] for row in cursor.fetchall()}
    if "role" not in users_columns:
        cursor.execute("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'guest'")
        cursor.execute("UPDATE users SET role = 'admin' WHERE oauth_provider = 'admin'")
        conn.commit()

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

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS revoked_tokens (
        jti TEXT PRIMARY KEY,
        token_type TEXT NOT NULL DEFAULT 'admin',
        revoked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL
    )
    ''')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_revoked_tokens_expires ON revoked_tokens(expires_at)')

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

    # ── Likes table ──────────────────────────────────────────────────────────
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS likes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            post_id INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
            UNIQUE(user_id, post_id)
        )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_likes_post ON likes(post_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_likes_user ON likes(user_id)")

    # ── View logs table ───────────────────────────────────────────────────────
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS view_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            post_id INTEGER NOT NULL,
            user_ip_hash TEXT,
            viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
        )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_view_logs_post_date ON view_logs(post_id, viewed_at)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_view_logs_date ON view_logs(viewed_at)")

    conn.commit()

    if conn_param is None:
        conn.close()
        # Seed database with test data if empty
        seed_database()
