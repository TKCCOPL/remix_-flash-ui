import sqlite3


def get_all_categories(conn: sqlite3.Connection) -> list[dict]:
    cursor = conn.cursor()
    cursor.execute('''
        SELECT id, name, slug, description, post_count
        FROM categories
        ORDER BY post_count DESC
    ''')
    categories = cursor.fetchall()
    return [dict(cat) for cat in categories]


def get_category_by_slug(conn: sqlite3.Connection, slug: str) -> dict | None:
    cursor = conn.cursor()
    cursor.execute('''
        SELECT id, name, slug, description, post_count
        FROM categories
        WHERE slug = ?
    ''', (slug,))
    category = cursor.fetchone()
    return dict(category) if category else None


def get_posts_by_category_slug(conn: sqlite3.Connection, slug: str) -> list[dict]:
    cursor = conn.cursor()
    cursor.execute('''
        SELECT p.id, p.title, p.content, p.category, p.image_url, p.created_at
        FROM posts p
        JOIN categories c ON p.category = c.name
        WHERE c.slug = ?
        ORDER BY p.created_at DESC
    ''', (slug,))
    posts = cursor.fetchall()
    return [dict(post) for post in posts]
