"""API router for user notifications."""

from fastapi import APIRouter, Depends, HTTPException, Query

from dependencies.auth import require_login, resolve_user_id
from database import get_db
from services.notification_service import (
    get_user_notifications,
    get_user_unread_count,
    mark_notification_read,
    mark_all_notifications_read,
)

router = APIRouter()


def get_current_user_id(user: dict = Depends(require_login), conn=Depends(get_db)) -> int:
    """Dependency to get the current user's database ID."""
    return resolve_user_id(user, conn)


@router.get("")
async def list_notifications(
    unread_only: bool = Query(False),
    user_id: int = Depends(get_current_user_id),
    conn=Depends(get_db),
):
    """List notifications for the current user."""
    notifications = get_user_notifications(conn, user_id, unread_only)
    unread_count = get_user_unread_count(conn, user_id)
    return {"notifications": notifications, "unread_count": unread_count}


@router.get("/unread-count")
async def get_unread_count_endpoint(
    user_id: int = Depends(get_current_user_id),
    conn=Depends(get_db),
):
    """Get unread notification count for the current user."""
    count = get_user_unread_count(conn, user_id)
    return {"unread_count": count}


@router.patch("/{notification_id}/read")
async def mark_read_endpoint(
    notification_id: int,
    user_id: int = Depends(get_current_user_id),
    conn=Depends(get_db),
):
    """Mark a notification as read."""
    success = mark_notification_read(conn, notification_id, user_id)
    if not success:
        raise HTTPException(404, "Notification not found")
    return {"message": "已标记为已读"}


@router.patch("/read-all")
async def mark_all_read_endpoint(
    user_id: int = Depends(get_current_user_id),
    conn=Depends(get_db),
):
    """Mark all notifications as read."""
    count = mark_all_notifications_read(conn, user_id)
    return {"message": f"已标记 {count} 条通知为已读"}
