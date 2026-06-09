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
    """Get top 10 posts by view count with comment and like counts."""
    cursor = conn.cursor()
    cursor.execute("""
        SELECT
            p.id,
            p.title,
            p.view_count,
            (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
            (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count
        FROM posts p
        WHERE p.status = 'published'
        ORDER BY p.view_count DESC
        LIMIT 10
    """)
    return [dict(row) for row in cursor.fetchall()]


def get_views_trend(conn: sqlite3.Connection, days: int = 30) -> dict:
    """Get views trend for the last N days."""
    cursor = conn.cursor()
    cursor.execute(
        """SELECT date(viewed_at) as date, COUNT(*) as views
           FROM view_logs
           WHERE viewed_at > datetime('now', ?)
           GROUP BY date(viewed_at)
           ORDER BY date""",
        (f"-{days} days",)
    )
    trend = [{"date": row["date"], "views": row["views"]} for row in cursor.fetchall()]
    total_views = sum(item["views"] for item in trend)
    avg_daily = total_views / days if days > 0 else 0
    return {
        "trend": trend,
        "total_views": total_views,
        "avg_daily": round(avg_daily, 1)
    }


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
