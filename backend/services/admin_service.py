from repositories.users_repository import (
    get_users_with_stats,
    count_users,
    get_user_by_id,
    get_user_stats,
    get_user_active_days,
    get_user_recent_comments,
    delete_user_cascade,
)


def get_users_list(
    conn,
    skip: int = 0,
    limit: int = 20,
    search: str | None = None,
    provider: str | None = None,
) -> dict:
    users = get_users_with_stats(conn, skip=skip, limit=limit, search=search, provider=provider)
    total = count_users(conn, search=search, provider=provider)
    return {"users": users, "total": total, "skip": skip, "limit": limit}


def get_user_detail(conn, user_id: int) -> dict:
    user = get_user_by_id(conn, user_id)
    if not user:
        raise ValueError("用户不存在")

    stats = get_user_stats(conn, user_id)
    active_days = get_user_active_days(conn, user_id)
    recent_comments = get_user_recent_comments(conn, user_id)

    return {
        "user": user,
        "stats": {
            **stats,
            "active_days": active_days,
        },
        "recent_comments": recent_comments,
    }


def delete_user(conn, user_id: int) -> dict:
    user = get_user_by_id(conn, user_id)
    if not user:
        raise ValueError("用户不存在")

    stats = get_user_stats(conn, user_id)

    try:
        delete_user_cascade(conn, user_id)
    except ValueError as e:
        raise ValueError(str(e))

    return {
        "message": "用户已删除",
        "deleted_comments": stats["comment_count"],
        "deleted_favorites": stats["favorite_count"],
    }
