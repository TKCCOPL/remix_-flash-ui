import sqlite3
import pytest
from repositories.comments_admin_repository import (
    get_comments_with_filter,
    update_comment_status,
    delete_comment_by_id,
    batch_delete_comments,
    get_filters,
    add_filter,
    delete_filter,
)


@pytest.fixture
def db():
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            oauth_provider TEXT NOT NULL,
            oauth_id TEXT NOT NULL,
            username TEXT NOT NULL,
            avatar_url TEXT,
            email TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cursor.execute("""
        CREATE TABLE posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cursor.execute("""
        CREATE TABLE comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            post_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            status TEXT DEFAULT 'approved',
            parent_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (post_id) REFERENCES posts(id),
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (parent_id) REFERENCES comments(id)
        )
    """)
    cursor.execute("""
        CREATE TABLE comment_filters (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filter_type TEXT NOT NULL,
            pattern TEXT NOT NULL,
            action TEXT DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("INSERT INTO users (oauth_provider, oauth_id, username) VALUES ('github', '1', '张三')")
    cursor.execute("INSERT INTO users (oauth_provider, oauth_id, username) VALUES ('gitee', '2', '李四')")
    cursor.execute("INSERT INTO posts (id, title, content) VALUES (1, '测试文章', '内容')")
    cursor.execute("INSERT INTO comments (post_id, user_id, content, status) VALUES (1, 1, '测试评论', 'approved')")
    cursor.execute("INSERT INTO comments (post_id, user_id, content, status) VALUES (1, 2, '待审核评论', 'pending')")
    conn.commit()
    yield conn
    conn.close()


def test_get_comments_all(db):
    comments = get_comments_with_filter(db)
    assert len(comments) == 2


def test_get_comments_filter_by_status(db):
    comments = get_comments_with_filter(db, status='pending')
    assert len(comments) == 1
    assert comments[0]['content'] == '待审核评论'


def test_get_comments_filter_by_search(db):
    comments = get_comments_with_filter(db, search='待审核')
    assert len(comments) == 1


def test_update_comment_status(db):
    result = update_comment_status(db, 2, 'approved')
    assert result is True
    comments = get_comments_with_filter(db, status='pending')
    assert len(comments) == 0


def test_delete_comment(db):
    result = delete_comment_by_id(db, 1)
    assert result is True
    comments = get_comments_with_filter(db)
    assert len(comments) == 1


def test_batch_delete_comments(db):
    count = batch_delete_comments(db, [1, 2])
    assert count == 2
    comments = get_comments_with_filter(db)
    assert len(comments) == 0


def test_add_and_get_filters(db):
    add_filter(db, 'keyword', 'spam', 'pending')
    add_filter(db, 'keyword', '广告', 'pending')
    filters = get_filters(db)
    assert len(filters) == 2


def test_delete_filter(db):
    add_filter(db, 'keyword', 'spam', 'pending')
    filters = get_filters(db)
    assert len(filters) == 1
    delete_filter(db, filters[0]['id'])
    filters = get_filters(db)
    assert len(filters) == 0
