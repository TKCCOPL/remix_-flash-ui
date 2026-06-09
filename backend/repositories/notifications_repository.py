"""Repository for notifications database operations."""

import sqlite3


def create_notification(conn: sqlite3.Connection, user_id: int, type: str, reference_id: int) -> int:
    """Create a new notification for a user."""
    cursor = conn.execute(
        "INSERT INTO notifications (user_id, type, reference_id) VALUES (?, ?, ?)",
        (user_id, type, reference_id),
    )
    conn.commit()
    return cursor.lastrowid


def get_notifications(conn: sqlite3.Connection, user_id: int, unread_only: bool = False) -> list:
    """Get notifications for a user, optionally filtered to unread only."""
    query = "SELECT * FROM notifications WHERE user_id = ?"
    if unread_only:
        query += " AND is_read = 0"
    query += " ORDER BY created_at DESC"
    cursor = conn.execute(query, (user_id,))
    return [dict(row) for row in cursor.fetchall()]


def get_unread_count(conn: sqlite3.Connection, user_id: int) -> int:
    """Get the count of unread notifications for a user."""
    cursor = conn.execute(
        "SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = 0",
        (user_id,),
    )
    return cursor.fetchone()[0]


def mark_as_read(conn: sqlite3.Connection, notification_id: int, user_id: int) -> bool:
    """Mark a specific notification as read. Returns True if updated."""
    cursor = conn.execute(
        "UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?",
        (notification_id, user_id),
    )
    conn.commit()
    return cursor.rowcount > 0


def mark_all_as_read(conn: sqlite3.Connection, user_id: int) -> int:
    """Mark all unread notifications as read. Returns count of updated rows."""
    cursor = conn.execute(
        "UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0",
        (user_id,),
    )
    conn.commit()
    return cursor.rowcount
