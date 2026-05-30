def test_create_comment_with_parent_id():
    """Test creating a reply comment with parent_id."""
    from schemas import CommentCreate

    # Valid parent_id
    comment = CommentCreate(content="This is a reply", parent_id=1)
    assert comment.parent_id == 1

    # No parent_id (top-level comment)
    comment = CommentCreate(content="Top level")
    assert comment.parent_id is None
