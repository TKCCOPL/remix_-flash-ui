"""Service layer for notification operations."""

import logging
import os

from fastapi import BackgroundTasks

from repositories.notifications_repository import (
    create_notification,
    get_notifications,
    get_unread_count,
    mark_as_read,
    mark_all_as_read,
)
from repositories.users_repository import get_user_by_id
from repositories.posts_repository import get_post

logger = logging.getLogger(__name__)

SITE_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")


def create_reply_notification(
    conn,
    user_id: int,
    comment_id: int,
    *,
    post_id: int | None = None,
    replier_name: str | None = None,
    background_tasks: BackgroundTasks | None = None,
) -> int:
    """Create a notification for a comment reply and optionally send an email."""
    notification_id = create_notification(conn, user_id, "comment_reply", comment_id)

    if background_tasks and post_id and replier_name:
        try:
            recipient = get_user_by_id(conn, user_id)
            if recipient and recipient.get("email"):
                post = get_post(conn, post_id)
                if post:
                    from services.email_service import send_reply_notification_email

                    background_tasks.add_task(
                        send_reply_notification_email,
                        recipient["email"],
                        replier_name,
                        post["title"],
                        f"{SITE_URL}/post/{post_id}",
                    )
        except Exception as e:
            logger.warning("Failed to enqueue email notification: %s", e)

    return notification_id


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
