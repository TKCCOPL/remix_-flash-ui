def get_posts(conn, skip: int = 0, limit: int = 10, include_drafts: bool = False):
    cursor = conn.cursor()
    query = """
        SELECT id, title, content, category, image_url, status, created_at, updated_at
        FROM posts
    """
    if not include_drafts:
        query += " WHERE status = 'published'"
    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
    
    cursor.execute(query, (limit, skip))
    return [dict(row) for row in cursor.fetchall()]


def get_post(conn, post_id: int):
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT id, title, content, category, image_url, status, created_at, updated_at, view_count
        FROM posts
        WHERE id = ?
        """,
        (post_id,),
    )
    row = cursor.fetchone()
    return dict(row) if row else None


def create_post(conn, title: str, content: str, category: str | None, image_url: str | None, status: str = 'published'):
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO posts (title, content, category, image_url, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'), datetime('now', 'localtime'))
        """,
        (title, content, category, image_url, status),
    )
    conn.commit()
    return cursor.lastrowid


def update_post(conn, post_id: int, title: str | None, content: str | None, category: str | None, image_url: str | None, status: str | None):
    cursor = conn.cursor()
    cursor.execute(
        """
        UPDATE posts
        SET title = COALESCE(?, title),
            content = COALESCE(?, content),
            category = COALESCE(?, category),
            image_url = COALESCE(?, image_url),
            status = COALESCE(?, status),
            updated_at = datetime('now', 'localtime')
        WHERE id = ?
        """,
        (title, content, category, image_url, status, post_id),
    )
    conn.commit()
    return cursor.rowcount > 0


def delete_post(conn, post_id: int):
    """Delete a post and its associated comments and favorites.

    Uses explicit transaction for atomicity.
    Best practice: https://www.sqlite.org/foreignkeys.html
    """
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM comments WHERE post_id = ?", (post_id,))
        cursor.execute("DELETE FROM favorites WHERE post_id = ?", (post_id,))
        cursor.execute("DELETE FROM posts WHERE id = ?", (post_id,))
        conn.commit()
        return cursor.rowcount > 0
    except Exception:
        conn.rollback()
        raise


def get_posts_for_archive(conn, include_drafts: bool = False):
    cursor = conn.cursor()
    query = '''
        SELECT id, title, SUBSTR(content, 1, 100) as summary, created_at
        FROM posts
    '''
    if not include_drafts:
        query += " WHERE status = 'published'"
    query += " ORDER BY created_at DESC"
    cursor.execute(query)
    posts = cursor.fetchall()

    archive = {}
    for post in posts:
        created_at = post['created_at']
        year = created_at[:4]
        month = created_at[5:7]

        if year not in archive:
            archive[year] = {}
        if month not in archive[year]:
            archive[year][month] = []

        summary = post['summary'] or ''
        if len(summary) >= 100:
            summary = summary + '...'

        archive[year][month].append({
            'id': post['id'],
            'title': post['title'],
            'created_at': created_at,
            'summary': summary
        })

    result = {}
    for year, months in archive.items():
        result[year] = []
        for month, posts in months.items():
            result[year].append({
                'month': month,
                'posts': posts
            })

    return result



from utils import escape_like as _escape_like

def search_posts(conn, query: str, include_drafts: bool = False):
    cursor = conn.cursor()
    sql = '''
        SELECT id, title, content, category, created_at
        FROM posts
        WHERE (title LIKE ? ESCAPE '\\' OR content LIKE ? ESCAPE '\\' OR category LIKE ? ESCAPE '\\')
    '''
    if not include_drafts:
        sql += " AND status = 'published'"
    sql += " ORDER BY created_at DESC"
    
    escaped = _escape_like(query)
    cursor.execute(sql, (f'%{escaped}%', f'%{escaped}%', f'%{escaped}%'))
    posts = cursor.fetchall()

    results = []
    for post in posts:
        content = post['content']
        summary = content[:100] + '...' if len(content) > 100 else content
        results.append({
            'id': post['id'],
            'title': post['title'],
            'summary': summary,
            'category': post['category'],
            'created_at': post['created_at']
        })

    return results


def log_search(conn, query: str, user_ip: str = None):
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO search_logs (query, user_ip)
        VALUES (?, ?)
    ''', (query, user_ip))
    conn.commit()


def update_post_status(conn, post_id: int, status: str):
    """Update post status and return the updated post info."""
    cursor = conn.cursor()
    cursor.execute(
        """
        UPDATE posts
        SET status = ?, updated_at = datetime('now', 'localtime')
        WHERE id = ?
        RETURNING id, title, status
        """,
        (status, post_id),
    )
    conn.commit()
    row = cursor.fetchone()
    if not row:
        return None
    return {"id": row["id"], "title": row["title"], "status": row["status"]}


def get_posts_by_status(conn, status: str, skip: int = 0, limit: int = 10):
    """Get posts filtered by status."""
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT id, title, content, category, image_url, status, created_at, updated_at
        FROM posts
        WHERE status = ?
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
        """,
        (status, limit, skip),
    )
    return [dict(row) for row in cursor.fetchall()]


def increment_view_count(conn, post_id: int):
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE posts SET view_count = view_count + 1 WHERE id = ?",
        (post_id,),
    )
    conn.commit()


def log_view(conn, post_id: int, user_ip_hash: str):
    """Log a view with anti-abuse (10 min cooldown per IP per post)."""
    cursor = conn.execute(
        """SELECT 1 FROM view_logs
           WHERE post_id = ? AND user_ip_hash = ?
           AND viewed_at > datetime('now', '-10 minutes')
           LIMIT 1""",
        (post_id, user_ip_hash)
    )
    if cursor.fetchone() is None:
        conn.execute(
            "INSERT INTO view_logs (post_id, user_ip_hash) VALUES (?, ?)",
            (post_id, user_ip_hash)
        )
        conn.commit()


def get_post_with_stats(conn, post_id: int, increment_view: bool = False):
    cursor = conn.cursor()
    if increment_view:
        cursor.execute(
            "UPDATE posts SET view_count = view_count + 1 WHERE id = ?",
            (post_id,),
        )
        conn.commit()
    cursor.execute(
        """
        SELECT p.id, p.title, p.content, p.category, p.image_url, p.status,
               p.created_at, p.updated_at, p.view_count,
               (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id AND c.status = 'approved') as comment_count,
               (SELECT COUNT(*) FROM favorites f WHERE f.post_id = p.id) as favorite_count
        FROM posts p
        WHERE p.id = ?
        """,
        (post_id,),
    )
    row = cursor.fetchone()
    return dict(row) if row else None
