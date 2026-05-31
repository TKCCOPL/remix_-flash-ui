import sqlite3


def get_overview(conn: sqlite3.Connection) -> dict:
    """Get overview statistics in a single query."""
    cursor = conn.cursor()
    cursor.execute("""
        SELECT
            (SELECT COUNT(*) FROM posts WHERE status = 'published') as post_count,
            (SELECT COUNT(*) FROM users) as user_count,
            (SELECT COUNT(*) FROM comments) as comment_count,
            (SELECT COUNT(*) FROM categories) as category_count,
            (SELECT COALESCE(SUM(view_count), 0) FROM posts WHERE status = 'published') as total_views,
            (SELECT COUNT(*) FROM favorites) as total_favorites
    """)
    row = cursor.fetchone()
    return dict(row)


def get_comments_trend(conn: sqlite3.Connection) -> list[dict]:
    """Get comments trend for the last 30 days."""
    cursor = conn.cursor()
    cursor.execute("""
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM comments
        WHERE created_at >= datetime('now', '-30 days')
        GROUP BY DATE(created_at)
        ORDER BY date
    """)
    return [dict(row) for row in cursor.fetchall()]


def get_popular_posts(conn: sqlite3.Connection) -> list[dict]:
    """Get top 10 posts by comment count."""
    cursor = conn.cursor()
    cursor.execute("""
        SELECT p.id, p.title, COUNT(c.id) as comment_count
        FROM posts p
        LEFT JOIN comments c ON c.post_id = p.id
        WHERE p.status = 'published'
        GROUP BY p.id
        ORDER BY comment_count DESC
        LIMIT 10
    """)
    return [dict(row) for row in cursor.fetchall()]


def get_category_distribution(conn: sqlite3.Connection) -> list[dict]:
    """Get post count by category."""
    cursor = conn.cursor()
    cursor.execute("""
        SELECT category, COUNT(*) as count
        FROM posts
        WHERE status = 'published' AND category IS NOT NULL
        GROUP BY category
        ORDER BY count DESC
    """)
    return [dict(row) for row in cursor.fetchall()]
