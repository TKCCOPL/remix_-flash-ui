import sqlite3
import pytest
from repositories.users_repository import (
    get_users_with_stats,
    get_user_stats,
    get_user_recent_comments,
    delete_user_cascade,
    count_users,
)


@pytest.fixture
def db():
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Create tables
    cursor.execute("""
        CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            oauth_provider TEXT NOT NULL,
            oauth_id TEXT NOT NULL,
            username TEXT NOT NULL,
            avatar_url TEXT,
            email TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(oauth_provider, oauth_id)
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
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (post_id) REFERENCES posts(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)
    cursor.execute("""
        CREATE TABLE favorites (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            post_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (post_id) REFERENCES posts(id),
            FOREIGN KEY (user_id) REFERENCES users(id),
            UNIQUE(post_id, user_id)
        )
    """)

    # Insert test data
    cursor.execute(
        "INSERT INTO users (oauth_provider, oauth_id, username, email) VALUES (?, ?, ?, ?)",
        ("admin", "admin", "管理员", "admin@blog.com"),
    )
    cursor.execute(
        "INSERT INTO users (oauth_provider, oauth_id, username, email) VALUES (?, ?, ?, ?)",
        ("github", "1001", "张三", "zhangsan@example.com"),
    )
    cursor.execute(
        "INSERT INTO users (oauth_provider, oauth_id, username, email) VALUES (?, ?, ?, ?)",
        ("gitee", "2001", "李四", "lisi@example.com"),
    )
    cursor.execute(
        "INSERT INTO posts (id, title, content) VALUES (?, ?, ?)",
        (1, "测试文章", "内容"),
    )
    cursor.execute(
        "INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)",
        (1, 2, "测试评论"),
    )
    cursor.execute(
        "INSERT INTO favorites (post_id, user_id) VALUES (?, ?)",
        (1, 2),
    )
    conn.commit()
    yield conn
    conn.close()


def test_get_users_with_stats_excludes_admin(db):
    """用户列表应排除管理员账号"""
    users = get_users_with_stats(db)
    assert len(users) == 2
    assert all(u["oauth_provider"] != "admin" for u in users)


def test_get_users_with_stats_search(db):
    """搜索功能应匹配用户名"""
    users = get_users_with_stats(db, search="张三")
    assert len(users) == 1
    assert users[0]["username"] == "张三"


def test_get_users_with_stats_search_email(db):
    """搜索功能应匹配邮箱"""
    users = get_users_with_stats(db, search="lisi@")
    assert len(users) == 1
    assert users[0]["username"] == "李四"


def test_get_users_with_stats_filter_provider(db):
    """筛选功能应按提供者过滤"""
    users = get_users_with_stats(db, provider="github")
    assert len(users) == 1
    assert users[0]["oauth_provider"] == "github"


def test_get_users_with_stats_pagination(db):
    """分页功能应正确工作"""
    users = get_users_with_stats(db, skip=0, limit=1)
    assert len(users) == 1

    users = get_users_with_stats(db, skip=1, limit=1)
    assert len(users) == 1


def test_get_users_with_stats_includes_counts(db):
    """用户列表应包含评论数和收藏数"""
    users = get_users_with_stats(db)
    user = next(u for u in users if u["username"] == "张三")
    assert user["comment_count"] == 1
    assert user["favorite_count"] == 1


def test_count_users_excludes_admin(db):
    """用户计数应排除管理员"""
    count = count_users(db)
    assert count == 2


def test_get_user_stats(db):
    """获取用户统计信息"""
    stats = get_user_stats(db, 2)
    assert stats["comment_count"] == 1
    assert stats["favorite_count"] == 1


def test_get_user_recent_comments(db):
    """获取用户最近评论"""
    comments = get_user_recent_comments(db, 2)
    assert len(comments) == 1
    assert comments[0]["content"] == "测试评论"
    assert comments[0]["post_title"] == "测试文章"


def test_delete_user_cascade(db):
    """删除用户应级联删除评论和收藏"""
    deleted = delete_user_cascade(db, 2)
    assert deleted is True

    # Verify user is deleted
    cursor = db.cursor()
    cursor.execute("SELECT * FROM users WHERE id = ?", (2,))
    assert cursor.fetchone() is None

    # Verify comments are deleted
    cursor.execute("SELECT * FROM comments WHERE user_id = ?", (2,))
    assert cursor.fetchone() is None

    # Verify favorites are deleted
    cursor.execute("SELECT * FROM favorites WHERE user_id = ?", (2,))
    assert cursor.fetchone() is None


def test_delete_user_cascade_nonexistent(db):
    """删除不存在的用户应返回 False"""
    deleted = delete_user_cascade(db, 999)
    assert deleted is False
