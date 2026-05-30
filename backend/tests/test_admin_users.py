import sqlite3
import tempfile
import os
import shutil
import pytest
from repositories.users_repository import (
    get_users_with_stats,
    get_user_stats,
    get_user_recent_comments,
    delete_user_cascade,
    count_users,
    get_user_active_days,
)
from services.admin_service import (
    get_users_list,
    get_user_detail,
    delete_user,
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
    cursor.execute(
        "INSERT INTO comments (post_id, user_id, content, created_at) VALUES (?, ?, ?, ?)",
        (1, 2, "第二天评论", "2024-01-02 10:00:00"),
    )
    cursor.execute(
        "INSERT INTO comments (post_id, user_id, content, created_at) VALUES (?, ?, ?, ?)",
        (1, 2, "同一天第二条评论", "2024-01-02 15:00:00"),
    )
    cursor.execute(
        "INSERT INTO favorites (post_id, user_id, created_at) VALUES (?, ?, ?)",
        (1, 3, "2024-01-01 10:00:00"),
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
    assert user["comment_count"] == 3
    assert user["favorite_count"] == 1


def test_count_users_excludes_admin(db):
    """用户计数应排除管理员"""
    count = count_users(db)
    assert count == 2


def test_count_users_with_search(db):
    """用户计数应支持搜索过滤"""
    count = count_users(db, search="张三")
    assert count == 1


def test_count_users_with_provider(db):
    """用户计数应支持提供者过滤"""
    count = count_users(db, provider="github")
    assert count == 1


def test_count_users_with_search_and_provider(db):
    """用户计数应同时支持搜索和提供者过滤"""
    count = count_users(db, search="张三", provider="github")
    assert count == 1
    count = count_users(db, search="张三", provider="gitee")
    assert count == 0


def test_get_user_stats(db):
    """获取用户统计信息"""
    stats = get_user_stats(db, 2)
    assert stats["comment_count"] == 3
    assert stats["favorite_count"] == 1


def test_get_user_recent_comments(db):
    """获取用户最近评论"""
    comments = get_user_recent_comments(db, 2)
    assert len(comments) == 3
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


def test_get_user_active_days(db):
    """活跃天数应统计不同的日期数"""
    # user 2 has comments on current date and 2024-01-02 = 2 distinct days
    days = get_user_active_days(db, 2)
    assert days == 2


def test_get_user_active_days_same_day(db):
    """同一天多次活动应计为1天"""
    # user 3 has one favorite on 2024-01-01 = 1 distinct day
    days = get_user_active_days(db, 3)
    assert days == 1


def test_get_users_list(db):
    result = get_users_list(db)
    assert "users" in result
    assert "total" in result
    assert len(result["users"]) == 2
    assert result["total"] == 2


def test_get_user_detail(db):
    detail = get_user_detail(db, 2)
    assert "user" in detail
    assert "stats" in detail
    assert "recent_comments" in detail
    assert detail["user"]["username"] == "张三"
    assert detail["stats"]["comment_count"] == 3


def test_get_user_detail_nonexistent(db):
    with pytest.raises(ValueError, match="用户不存在"):
        get_user_detail(db, 999)


def test_delete_user_success(db):
    result = delete_user(db, 2)
    assert result["message"] == "用户已删除"
    assert result["deleted_comments"] == 3
    assert result["deleted_favorites"] == 1


def test_delete_user_nonexistent(db):
    with pytest.raises(ValueError, match="用户不存在"):
        delete_user(db, 999)


from fastapi.testclient import TestClient
from main import app
from dependencies.auth import require_login
from database import get_db


_api_db_file = tempfile.mktemp(suffix=".sqlite3")
_api_conn = sqlite3.connect(_api_db_file)
_api_conn.row_factory = sqlite3.Row
_api_cursor = _api_conn.cursor()

_api_cursor.execute("""
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
_api_cursor.execute("""
    CREATE TABLE posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
""")
_api_cursor.execute("""
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
_api_cursor.execute("""
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

_api_cursor.execute(
    "INSERT INTO users (oauth_provider, oauth_id, username, email) VALUES (?, ?, ?, ?)",
    ("admin", "admin", "管理员", "admin@blog.com"),
)
_api_cursor.execute(
    "INSERT INTO users (oauth_provider, oauth_id, username, email) VALUES (?, ?, ?, ?)",
    ("github", "1001", "张三", "zhangsan@example.com"),
)
_api_cursor.execute(
    "INSERT INTO users (oauth_provider, oauth_id, username, email) VALUES (?, ?, ?, ?)",
    ("gitee", "2001", "李四", "lisi@example.com"),
)
_api_cursor.execute(
    "INSERT INTO posts (id, title, content) VALUES (?, ?, ?)",
    (1, "测试文章", "内容"),
)
_api_cursor.execute(
    "INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)",
    (1, 2, "测试评论"),
)
_api_cursor.execute(
    "INSERT INTO favorites (post_id, user_id) VALUES (?, ?)",
    (1, 2),
)
_api_conn.commit()


def override_require_login():
    return True


def override_get_db():
    conn = sqlite3.connect(_api_db_file)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


app.dependency_overrides[require_login] = override_require_login
app.dependency_overrides[get_db] = override_get_db
client = TestClient(app, base_url="https://testserver")


def _get_csrf_headers(c: TestClient) -> dict:
    if "csrf_token" not in c.cookies:
        c.get("/api/auth/me")
    csrf_signed = c.cookies.get("csrf_token")
    if not csrf_signed:
        return {}
    csrf_token = csrf_signed.rsplit(".", 1)[0] if "." in csrf_signed else csrf_signed
    return {"X-CSRF-Token": csrf_token}


def test_api_get_users():
    response = client.get("/api/admin/users")
    assert response.status_code == 200
    data = response.json()
    assert "users" in data
    assert "total" in data


def test_api_get_users_with_search():
    response = client.get("/api/admin/users?search=张三")
    assert response.status_code == 200
    data = response.json()
    assert len(data["users"]) == 1
    assert data["users"][0]["username"] == "张三"


def test_api_get_users_with_provider_filter():
    response = client.get("/api/admin/users?provider=github")
    assert response.status_code == 200
    data = response.json()
    assert all(u["oauth_provider"] == "github" for u in data["users"])


def test_api_get_user_detail():
    response = client.get("/api/admin/users/2")
    assert response.status_code == 200
    data = response.json()
    assert "user" in data
    assert "stats" in data
    assert "recent_comments" in data


def test_api_get_user_detail_not_found():
    response = client.get("/api/admin/users/999")
    assert response.status_code == 404


def test_api_delete_user():
    response = client.delete(
        "/api/admin/users/3", headers=_get_csrf_headers(client)
    )
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "用户已删除"


def test_api_delete_user_not_found():
    response = client.delete(
        "/api/admin/users/999", headers=_get_csrf_headers(client)
    )
    assert response.status_code == 404
