from repositories.posts_repository import (
    create_post as create_post_repository,
    delete_post as delete_post_repository,
    get_post as get_post_repository,
    get_posts as get_posts_repository,
    get_posts_by_status as get_posts_by_status_repository,
    get_posts_for_archive as get_posts_for_archive_repository,
    log_search as log_search_repository,
    search_posts as search_posts_repository,
    update_post as update_post_repository,
    update_post_status as update_post_status_repository,
)
from schemas import PostCreate, PostUpdate


def create_post(conn, post: PostCreate):
    post_id = create_post_repository(conn, post.title, post.content, post.category, post.image_url, post.status)
    return get_post_repository(conn, post_id)


def list_posts(conn, skip: int = 0, limit: int = 10, include_drafts: bool = False):
    return get_posts_repository(conn, skip=skip, limit=limit, include_drafts=include_drafts)


def get_post(conn, post_id: int):
    return get_post_repository(conn, post_id)


def update_post(conn, post_id: int, post: PostUpdate):
    updated = update_post_repository(conn, post_id, post.title, post.content, post.category, post.image_url, post.status)
    if not updated:
        return None
    return get_post_repository(conn, post_id)


def delete_post(conn, post_id: int):
    return delete_post_repository(conn, post_id)


def get_archive_data(conn, include_drafts: bool = False):
    return get_posts_for_archive_repository(conn, include_drafts=include_drafts)


def search_posts_by_query(conn, query: str, user_ip: str = None, include_drafts: bool = False):
    results = search_posts_repository(conn, query, include_drafts=include_drafts)
    log_search_repository(conn, query, user_ip)
    return results


def update_post_status(conn, post_id: int, status: str):
    return update_post_status_repository(conn, post_id, status)


def get_posts_by_status(conn, status: str, skip: int = 0, limit: int = 10):
    return get_posts_by_status_repository(conn, status, skip=skip, limit=limit)
