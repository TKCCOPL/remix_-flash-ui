import sqlite3
from typing import List, Dict, Any

def get_posts(conn: sqlite3.Connection, skip: int = 0, limit: int = 10) -> List[Dict[str, Any]]:
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, title, content, category, created_at, updated_at 
        FROM posts 
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
    """, (limit, skip))
    return [dict(row) for row in cursor.fetchall()]

def get_post(conn: sqlite3.Connection, post_id: int) -> Dict[str, Any]:
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, title, content, category, created_at, updated_at 
        FROM posts WHERE id = ?
    """, (post_id,))
    row = cursor.fetchone()
    return dict(row) if row else None

def create_post(conn: sqlite3.Connection, title: str, content: str, category: str):
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO posts (title, content, category, created_at, updated_at) 
        VALUES (?, ?, ?, datetime('now', 'localtime'), datetime('now', 'localtime'))
    """, (title, content, category))
    conn.commit()
    return cursor.lastrowid

def update_post(conn: sqlite3.Connection, post_id: int, title: str, content: str, category: str):
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE posts 
        SET title = COALESCE(?, title),
            content = COALESCE(?, content),
            category = COALESCE(?, category),
            updated_at = datetime('now', 'localtime')
        WHERE id = ?
    """, (title, content, category, post_id))
    conn.commit()
    return cursor.rowcount > 0

def delete_post(conn: sqlite3.Connection, post_id: int):
    cursor = conn.cursor()
    cursor.execute("DELETE FROM posts WHERE id = ?", (post_id,))
    conn.commit()
    return cursor.rowcount > 0
