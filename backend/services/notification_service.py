"""Service layer for notification operations."""

from repositories.notifications_repository import (
    create_notification,
    get_notifications,
    get_unread_count,
    mark_as_read,
    mark_all_as_read,
)


def create_reply_notification(conn, user_id: int, comment_id: int) -> int:
    """Create a notification for a comment reply."""
    return create_notification(conn, user_id, "comment_reply", comment_id)


def get_user_notifications(conn, user_id: int, unread_only: bool = False) -> list:
    """Get notifications for a user."""
    return get_notifications(conn, user_id, unread_only)


def get_user_unread_count(conn, user_id: int) -> int:
    """Get unread notification count for a user."""
    return get_unread_count(conn, user_id)


def mark_notification_read(conn, notification_id: int, user_id: int) -> bool:
    """Mark a single notification as read."""
    return mark_as_read(conn, notification_id, user_id)


def mark_all_notifications_read(conn, user_id: int) -> int:
    """Mark all notifications as read for a user."""
    return mark_all_as_read(conn, user_id)
