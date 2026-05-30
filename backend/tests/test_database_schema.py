import sqlite3
import os
from unittest.mock import patch
import pytest
from database import init_db, get_db


@pytest.fixture
def test_db(tmp_path):
    db_path = str(tmp_path / 'test.sqlite3')
    with patch('database.DB_FILE', db_path):
        init_db()
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    yield conn
    conn.close()


def test_categories_table_exists(test_db):
    cursor = test_db.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='categories'")
    result = cursor.fetchone()
    assert result is not None
    assert result[0] == 'categories'


def test_categories_columns(test_db):
    cursor = test_db.cursor()
    cursor.execute("PRAGMA table_info(categories)")
    columns = {row[1] for row in cursor.fetchall()}
    expected_columns = {'id', 'name', 'slug', 'description', 'post_count'}
    assert columns == expected_columns


def get_unique_columns(test_db, table_name):
    cursor = test_db.cursor()
    cursor.execute(f"PRAGMA index_list({table_name})")
    indexes = cursor.fetchall()
    unique_indexes = [idx for idx in indexes if idx[2] == 1]
    unique_columns = set()
    for idx in unique_indexes:
        index_name = idx[1]
        cursor.execute(f"PRAGMA index_info({index_name})")
        for col in cursor.fetchall():
            unique_columns.add(col[2])
    return unique_columns


def test_categories_name_unique(test_db):
    unique_columns = get_unique_columns(test_db, 'categories')
    assert 'name' in unique_columns, "name column should have UNIQUE constraint"


def test_categories_slug_unique(test_db):
    unique_columns = get_unique_columns(test_db, 'categories')
    assert 'slug' in unique_columns, "slug column should have UNIQUE constraint"


def test_categories_post_count_default(test_db):
    cursor = test_db.cursor()
    cursor.execute("PRAGMA table_info(categories)")
    columns = {row[1]: row for row in cursor.fetchall()}
    post_count_col = columns['post_count']
    assert post_count_col[4] == '0', "post_count column should have DEFAULT 0"


def test_search_logs_table_exists(test_db):
    cursor = test_db.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='search_logs'")
    result = cursor.fetchone()
    assert result is not None
    assert result[0] == 'search_logs'


def test_search_logs_columns(test_db):
    cursor = test_db.cursor()
    cursor.execute("PRAGMA table_info(search_logs)")
    columns = {row[1] for row in cursor.fetchall()}
    expected_columns = {'id', 'query', 'user_ip', 'searched_at'}
    assert columns == expected_columns


def test_search_logs_query_not_null(test_db):
    cursor = test_db.cursor()
    cursor.execute("PRAGMA table_info(search_logs)")
    columns = {row[1]: row for row in cursor.fetchall()}
    query_col = columns['query']
    assert query_col[3] == 1, "query column should have NOT NULL constraint"


def test_search_logs_searched_at_default(test_db):
    cursor = test_db.cursor()
    cursor.execute("PRAGMA table_info(search_logs)")
    columns = {row[1]: row for row in cursor.fetchall()}
    searched_at_col = columns['searched_at']
    assert searched_at_col[4] == 'CURRENT_TIMESTAMP', "searched_at column should have DEFAULT CURRENT_TIMESTAMP"


def test_posts_table_exists(test_db):
    cursor = test_db.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='posts'")
    result = cursor.fetchone()
    assert result is not None
    assert result[0] == 'posts'


def test_posts_columns(test_db):
    cursor = test_db.cursor()
    cursor.execute("PRAGMA table_info(posts)")
    columns = {row[1] for row in cursor.fetchall()}
    expected_columns = {'id', 'title', 'content', 'category', 'image_url', 'status', 'view_count', 'created_at', 'updated_at'}
    assert columns == expected_columns


def test_posts_table_has_view_count_column(test_db):
    cursor = test_db.cursor()
    cursor.execute("PRAGMA table_info(posts)")
    columns = {row[1] for row in cursor.fetchall()}
    assert "view_count" in columns, "posts table should have view_count column"


def test_posts_view_count_default(test_db):
    cursor = test_db.cursor()
    cursor.execute("PRAGMA table_info(posts)")
    columns = {row[1]: row for row in cursor.fetchall()}
    view_count_col = columns['view_count']
    assert view_count_col[2] == 'INTEGER', "view_count should be INTEGER type"
    assert view_count_col[4] == '0', "view_count should have DEFAULT 0"


def test_users_table_exists(test_db):
    cursor = test_db.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
    result = cursor.fetchone()
    assert result is not None
    assert result[0] == 'users'


def test_users_columns(test_db):
    cursor = test_db.cursor()
    cursor.execute("PRAGMA table_info(users)")
    columns = {row[1] for row in cursor.fetchall()}
    expected_columns = {'id', 'oauth_provider', 'oauth_id', 'username', 'avatar_url', 'email', 'created_at'}
    assert columns == expected_columns


def test_users_oauth_unique(test_db):
    cursor = test_db.cursor()
    cursor.execute("PRAGMA index_list(users)")
    indexes = cursor.fetchall()
    unique_indexes = [idx for idx in indexes if idx[2] == 1]
    unique_columns = set()
    for idx in unique_indexes:
        index_name = idx[1]
        cursor.execute(f"PRAGMA index_info({index_name})")
        for col in cursor.fetchall():
            unique_columns.add(col[2])
    assert 'oauth_provider' in unique_columns, "oauth_provider should have UNIQUE constraint with oauth_id"
    assert 'oauth_id' in unique_columns, "oauth_id should have UNIQUE constraint with oauth_provider"


def test_comments_table_exists(test_db):
    cursor = test_db.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='comments'")
    result = cursor.fetchone()
    assert result is not None
    assert result[0] == 'comments'


def test_comments_columns(test_db):
    cursor = test_db.cursor()
    cursor.execute("PRAGMA table_info(comments)")
    columns = {row[1] for row in cursor.fetchall()}
    expected_columns = {'id', 'post_id', 'user_id', 'content', 'status', 'created_at', 'parent_id'}
    assert columns == expected_columns


def test_comments_table_has_parent_id_column(test_db):
    cursor = test_db.cursor()
    cursor.execute("PRAGMA table_info(comments)")
    columns = {row[1] for row in cursor.fetchall()}
    assert "parent_id" in columns, "comments table should have parent_id column"


def test_comments_parent_id_is_nullable(test_db):
    cursor = test_db.cursor()
    cursor.execute("PRAGMA table_info(comments)")
    columns = {row[1]: row for row in cursor.fetchall()}
    parent_id_col = columns['parent_id']
    assert parent_id_col[3] == 0, "parent_id should be nullable (NOT NULL = 0)"


def test_comments_status_default(test_db):
    cursor = test_db.cursor()
    cursor.execute("PRAGMA table_info(comments)")
    columns = {row[1]: row for row in cursor.fetchall()}
    status_col = columns['status']
    assert status_col[4] in ("approved", "'approved'"), "status column should have DEFAULT 'approved'"


def test_comments_post_id_not_null(test_db):
    cursor = test_db.cursor()
    cursor.execute("PRAGMA table_info(comments)")
    columns = {row[1]: row for row in cursor.fetchall()}
    post_id_col = columns['post_id']
    assert post_id_col[3] == 1, "post_id should have NOT NULL constraint"


def test_comments_user_id_not_null(test_db):
    cursor = test_db.cursor()
    cursor.execute("PRAGMA table_info(comments)")
    columns = {row[1]: row for row in cursor.fetchall()}
    user_id_col = columns['user_id']
    assert user_id_col[3] == 1, "user_id should have NOT NULL constraint"


def test_favorites_table_exists(test_db):
    cursor = test_db.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='favorites'")
    result = cursor.fetchone()
    assert result is not None
    assert result[0] == 'favorites'


def test_favorites_columns(test_db):
    cursor = test_db.cursor()
    cursor.execute("PRAGMA table_info(favorites)")
    columns = {row[1] for row in cursor.fetchall()}
    expected_columns = {'id', 'post_id', 'user_id', 'created_at'}
    assert columns == expected_columns


def test_favorites_unique(test_db):
    cursor = test_db.cursor()
    cursor.execute("PRAGMA index_list(favorites)")
    indexes = cursor.fetchall()
    unique_indexes = [idx for idx in indexes if idx[2] == 1]
    unique_columns = set()
    for idx in unique_indexes:
        index_name = idx[1]
        cursor.execute(f"PRAGMA index_info({index_name})")
        for col in cursor.fetchall():
            unique_columns.add(col[2])
    assert 'post_id' in unique_columns, "post_id should have UNIQUE constraint with user_id"
    assert 'user_id' in unique_columns, "user_id should have UNIQUE constraint with post_id"


def test_indexes_exist(test_db):
    cursor = test_db.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_users_oauth'")
    assert cursor.fetchone() is not None
    cursor.execute("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_comments_post'")
    assert cursor.fetchone() is not None
    cursor.execute("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_comments_user'")
    assert cursor.fetchone() is not None
    cursor.execute("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_favorites_user'")
    assert cursor.fetchone() is not None
    cursor.execute("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_favorites_post'")
    assert cursor.fetchone() is not None
    cursor.execute("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_comments_parent'")
    assert cursor.fetchone() is not None
