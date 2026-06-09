# backend/repositories/likes_repository.py
import sqlite3


def toggle_like_atomic(conn: sqlite3.Connection, user_id: int, post_id: int) -> bool:
    """Toggle like status. Returns True if liked, False if unliked."""
    try:
        conn.execute(
            "INSERT INTO likes (user_id, post_id) VALUES (?, ?)",
            (user_id, post_id),
        )
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        conn.execute(
            "DELETE FROM likes WHERE user_id = ? AND post_id = ?",
            (user_id, post_id),
        )
        conn.commit()
        return False


def count_likes(conn: sqlite3.Connection, post_id: int) -> int:
    """Count total likes for a post."""
    cursor = conn.execute(
        "SELECT COUNT(*) FROM likes WHERE post_id = ?",
        (post_id,),
    )
    return cursor.fetchone()[0]


def check_is_liked(conn: sqlite3.Connection, post_id: int, user_id: int) -> bool:
    """Check if a user has liked a post."""
    cursor = conn.execute(
        "SELECT 1 FROM likes WHERE post_id = ? AND user_id = ?",
        (post_id, user_id),
    )
    return cursor.fetchone() is not None


def get_likes_for_posts(
    conn: sqlite3.Connection, user_id: int, post_ids: list[int]
) -> dict:
    """Get like status and count for multiple posts."""
    if not post_ids:
        return {}

    placeholders = ",".join("?" * len(post_ids))

    # Get counts for all posts
    counts = {}
    for row in conn.execute(
        f"SELECT post_id, COUNT(*) as cnt FROM likes WHERE post_id IN ({placeholders}) GROUP BY post_id",
        post_ids,
    ):
        counts[row["post_id"]] = row["cnt"]

    # Get user's liked posts
    user_likes = set()
    for row in conn.execute(
        f"SELECT post_id FROM likes WHERE user_id = ? AND post_id IN ({placeholders})",
        [user_id] + post_ids,
    ):
        user_likes.add(row["post_id"])

    return {
        str(pid): {"liked": pid in user_likes, "count": counts.get(pid, 0)}
        for pid in post_ids
    }
