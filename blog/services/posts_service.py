from repositories.posts_repository import (
    create_post as create_post_repository,
    delete_post as delete_post_repository,
    get_post as get_post_repository,
    get_posts as get_posts_repository,
    update_post as update_post_repository,
)
from schemas import PostCreate, PostUpdate


def create_post(conn, post: PostCreate):
    post_id = create_post_repository(conn, post.title, post.content, post.category, post.image_url)
    return get_post_repository(conn, post_id)


def list_posts(conn, skip: int = 0, limit: int = 10):
    return get_posts_repository(conn, skip=skip, limit=limit)


def get_post(conn, post_id: int):
    return get_post_repository(conn, post_id)


def update_post(conn, post_id: int, post: PostUpdate):
    updated = update_post_repository(conn, post_id, post.title, post.content, post.category, post.image_url)
    if not updated:
        return None
    return get_post_repository(conn, post_id)


def delete_post(conn, post_id: int):
    return delete_post_repository(conn, post_id)
