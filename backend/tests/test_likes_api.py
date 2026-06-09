import pytest
import sqlite3

def test_likes_table_exists():
    """Test that likes table is created on init"""
    from database import init_db

    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    init_db(conn)

    cursor = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='likes'"
    )
    assert cursor.fetchone() is not None
    conn.close()

def _setup_db():
    """Create an in-memory DB with likes table, a test user, and a test post."""
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    from database import init_db
    init_db(conn)
    conn.execute(
        "INSERT INTO users (oauth_provider, oauth_id, username) VALUES ('test', '1', 'testuser')"
    )
    conn.execute(
        "INSERT INTO posts (title, content, category) VALUES ('Test', 'Content', 'tech')"
    )
    conn.commit()
    return conn


def test_count_likes_zero():
    """count_likes returns 0 when no likes exist"""
    from repositories.likes_repository import count_likes
    conn = _setup_db()
    assert count_likes(conn, post_id=1) == 0
    conn.close()


def test_count_likes_after_likes():
    """count_likes returns correct count after multiple users like a post"""
    from repositories.likes_repository import count_likes, toggle_like_atomic
    conn = _setup_db()
    # Add a second user
    conn.execute(
        "INSERT INTO users (oauth_provider, oauth_id, username) VALUES ('test', '2', 'user2')"
    )
    conn.commit()

    toggle_like_atomic(conn, user_id=1, post_id=1)
    toggle_like_atomic(conn, user_id=2, post_id=1)
    assert count_likes(conn, post_id=1) == 2

    # Unlike one user, count should decrease
    toggle_like_atomic(conn, user_id=1, post_id=1)
    assert count_likes(conn, post_id=1) == 1
    conn.close()


def test_check_is_liked_false():
    """check_is_liked returns False when user has not liked the post"""
    from repositories.likes_repository import check_is_liked
    conn = _setup_db()
    assert check_is_liked(conn, post_id=1, user_id=1) is False
    conn.close()


def test_check_is_liked_true():
    """check_is_liked returns True after user likes the post"""
    from repositories.likes_repository import check_is_liked, toggle_like_atomic
    conn = _setup_db()
    toggle_like_atomic(conn, user_id=1, post_id=1)
    assert check_is_liked(conn, post_id=1, user_id=1) is True
    conn.close()


def test_check_is_liked_after_unlike():
    """check_is_liked returns False after user unlikes the post"""
    from repositories.likes_repository import check_is_liked, toggle_like_atomic
    conn = _setup_db()
    toggle_like_atomic(conn, user_id=1, post_id=1)  # like
    toggle_like_atomic(conn, user_id=1, post_id=1)  # unlike
    assert check_is_liked(conn, post_id=1, user_id=1) is False
    conn.close()


def test_get_likes_for_posts_empty():
    """get_likes_for_posts returns empty dict for empty post_ids"""
    from repositories.likes_repository import get_likes_for_posts
    conn = _setup_db()
    result = get_likes_for_posts(conn, user_id=1, post_ids=[])
    assert result == {}
    conn.close()


def test_get_likes_for_posts_no_likes():
    """get_likes_for_posts returns liked=False and count=0 when no likes exist"""
    from repositories.likes_repository import get_likes_for_posts
    conn = _setup_db()
    result = get_likes_for_posts(conn, user_id=1, post_ids=[1])
    assert result["1"]["liked"] is False
    assert result["1"]["count"] == 0
    conn.close()


def test_get_likes_for_posts_with_likes():
    """get_likes_for_posts returns correct liked status and count"""
    from repositories.likes_repository import get_likes_for_posts, toggle_like_atomic
    conn = _setup_db()
    # Create a second post
    conn.execute(
        "INSERT INTO posts (title, content, category) VALUES ('Test 2', 'Content 2', 'tech')"
    )
    conn.execute(
        "INSERT INTO users (oauth_provider, oauth_id, username) VALUES ('test', '2', 'user2')"
    )
    conn.commit()

    # user1 likes post1, user2 likes post1 and post2
    toggle_like_atomic(conn, user_id=1, post_id=1)
    toggle_like_atomic(conn, user_id=2, post_id=1)
    toggle_like_atomic(conn, user_id=2, post_id=2)

    result = get_likes_for_posts(conn, user_id=1, post_ids=[1, 2])
    # post1: user1 liked it, 2 total likes
    assert result["1"]["liked"] is True
    assert result["1"]["count"] == 2
    # post2: user1 did not like it, 1 total like
    assert result["2"]["liked"] is False
    assert result["2"]["count"] == 1
    conn.close()


def test_get_likes_for_posts_only_counts_target_posts():
    """get_likes_for_posts does not leak counts from other posts"""
    from repositories.likes_repository import get_likes_for_posts, toggle_like_atomic
    conn = _setup_db()
    conn.execute(
        "INSERT INTO posts (title, content, category) VALUES ('Other', 'Content', 'tech')"
    )
    conn.execute(
        "INSERT INTO users (oauth_provider, oauth_id, username) VALUES ('test', '2', 'user2')"
    )
    conn.commit()

    # Like post 2 only, but query post 1
    toggle_like_atomic(conn, user_id=2, post_id=2)
    result = get_likes_for_posts(conn, user_id=1, post_ids=[1])
    assert result["1"]["liked"] is False
    assert result["1"]["count"] == 0
    conn.close()


def test_toggle_like_atomic():
    """Test toggle like returns True on insert, False on delete"""
    from repositories.likes_repository import toggle_like_atomic

    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    from database import init_db
    init_db(conn)

    # Insert a test user and post
    conn.execute("INSERT INTO users (oauth_provider, oauth_id, username) VALUES ('test', '1', 'testuser')")
    conn.execute("INSERT INTO posts (title, content, category) VALUES ('Test', 'Content', 'tech')")
    conn.commit()

    # First toggle should return True (liked)
    result = toggle_like_atomic(conn, user_id=1, post_id=1)
    assert result is True

    # Second toggle should return False (unliked)
    result = toggle_like_atomic(conn, user_id=1, post_id=1)
    assert result is False

    conn.close()
