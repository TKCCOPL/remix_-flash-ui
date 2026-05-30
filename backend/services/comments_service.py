import sqlite3

from repositories.comments_repository import (
    create_comment_record,
    get_comment_by_id,
    get_comments_by_post_id,
    get_comments_by_user_id,
    delete_comment_record,
)

MAX_COMMENT_LENGTH = 1000


def create_comment(conn, post_id: int, user_id: int, content: str, parent_id: int = None):
    if len(content) > MAX_COMMENT_LENGTH:
        raise ValueError(f"Comment is too long (max {MAX_COMMENT_LENGTH} characters)")

    if parent_id is not None:
        parent = get_comment_by_id(conn, parent_id)
        if not parent:
            raise ValueError("Parent comment not found")
        if parent["post_id"] != post_id:
            raise ValueError("Parent comment belongs to a different post")
        if parent["parent_id"] is not None:
            raise ValueError("Cannot reply to a reply (only one level allowed)")

    comment_id = create_comment_record(conn, post_id, user_id, content, parent_id=parent_id)
    return get_comment_by_id(conn, comment_id)


def get_comments_by_post(conn, post_id: int, skip: int = 0, limit: int = 20):
    return get_comments_by_post_id(conn, post_id, skip=skip, limit=limit)


def delete_comment(conn, comment_id: int, user_id: int):
    comment = get_comment_by_id(conn, comment_id)
    if not comment:
        return False
    if comment["user_id"] != user_id:
        return False
    return delete_comment_record(conn, comment_id)


def get_comments_by_user(conn: sqlite3.Connection, user_id: int, skip: int = 0, limit: int = 20) -> list[dict]:
    """Get comments by user id."""
    return get_comments_by_user_id(conn, user_id, skip, limit)
