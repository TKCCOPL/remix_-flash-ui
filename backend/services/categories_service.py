from repositories.categories_repository import get_all_categories, get_category_by_slug, get_posts_by_category_slug


def list_categories(conn):
    return get_all_categories(conn)


def get_category(conn, slug):
    return get_category_by_slug(conn, slug)


def get_category_posts(conn, slug):
    return get_posts_by_category_slug(conn, slug)
