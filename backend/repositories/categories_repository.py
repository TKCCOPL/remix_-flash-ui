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
