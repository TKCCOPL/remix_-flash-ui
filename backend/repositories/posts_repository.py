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
        SELECT id, title, content, category, image_url, status, created_at, updated_at
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
    cursor = conn.cursor()
    cursor.execute("DELETE FROM posts WHERE id = ?", (post_id,))
    conn.commit()
    return cursor.rowcount > 0


def get_posts_for_archive(conn, include_drafts: bool = False):
    cursor = conn.cursor()
    query = '''
        SELECT id, title, content, created_at
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

        content = post['content']
        summary = content[:100] + '...' if len(content) > 100 else content

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


def search_posts(conn, query: str, include_drafts: bool = False):
    cursor = conn.cursor()
    sql = '''
        SELECT id, title, content, category, created_at
        FROM posts
        WHERE (title LIKE ? OR content LIKE ? OR category LIKE ?)
    '''
    if not include_drafts:
        sql += " AND status = 'published'"
    sql += " ORDER BY created_at DESC"
    
    cursor.execute(sql, (f'%{query}%', f'%{query}%', f'%{query}%'))
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
