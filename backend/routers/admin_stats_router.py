from fastapi import APIRouter, Depends, Request
import sqlite3

from database import get_db
from dependencies.auth import require_login

router = APIRouter()


@router.get("/overview")
def get_overview(
    request: Request,
    conn: sqlite3.Connection = Depends(get_db),
    _=Depends(require_login),
):
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM posts WHERE status = 'published'")
    post_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM users WHERE oauth_provider != 'admin'")
    user_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM comments")
    comment_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM categories")
    category_count = cursor.fetchone()[0]

    return {
        "post_count": post_count,
        "user_count": user_count,
        "comment_count": comment_count,
        "category_count": category_count,
    }


@router.get("/comments-trend")
def get_comments_trend(
    request: Request,
    conn: sqlite3.Connection = Depends(get_db),
    _=Depends(require_login),
):
    cursor = conn.cursor()
    cursor.execute("""
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM comments
        WHERE created_at >= datetime('now', '-30 days')
        GROUP BY DATE(created_at)
        ORDER BY date
    """)
    trend = [dict(row) for row in cursor.fetchall()]
    return {"trend": trend}


@router.get("/popular-posts")
def get_popular_posts(
    request: Request,
    conn: sqlite3.Connection = Depends(get_db),
    _=Depends(require_login),
):
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
    posts = [dict(row) for row in cursor.fetchall()]
    return {"posts": posts}


@router.get("/category-distribution")
def get_category_distribution(
    request: Request,
    conn: sqlite3.Connection = Depends(get_db),
    _=Depends(require_login),
):
    cursor = conn.cursor()
    cursor.execute("""
        SELECT category, COUNT(*) as count
        FROM posts
        WHERE status = 'published' AND category IS NOT NULL
        GROUP BY category
        ORDER BY count DESC
    """)
    categories = [dict(row) for row in cursor.fetchall()]
    return {"categories": categories}
