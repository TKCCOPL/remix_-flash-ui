import re
from datetime import datetime, timedelta


def check_comment_length(content: str, min_length: int = 2) -> tuple[bool, str]:
    """Check if comment meets minimum length requirement."""
    if len(content.strip()) < min_length:
        return False, "评论内容太短"
    return True, ""


def check_link_count(content: str, max_links: int = 2) -> tuple[bool, str]:
    """Check if comment contains too many links."""
    url_pattern = r'https?://\S+'
    links = re.findall(url_pattern, content)
    if len(links) > max_links:
        return True, f"评论包含 {len(links)} 个链接，超过限制"
    return False, ""


def check_keywords(content: str, keywords: list[str]) -> tuple[bool, str]:
    """Check if comment contains blacklisted keywords."""
    content_lower = content.lower()
    for keyword in keywords:
        if keyword.lower() in content_lower:
            return True, f"评论包含敏感词: {keyword}"
    return False, ""


def check_honeypot(honeypot_value: str) -> bool:
    """Check if honeypot field was filled (bot detection)."""
    return bool(honeypot_value and honeypot_value.strip())


def filter_comment(
    content: str,
    keywords: list[str],
    honeypot_value: str = "",
) -> tuple[str, str]:
    """
    Apply all filters to a comment.
    Returns: (status, reason)
    - status: 'approved', 'pending', or 'rejected'
    - reason: explanation of why the comment was filtered
    """
    # Check honeypot (silent reject)
    if check_honeypot(honeypot_value):
        return "rejected", ""

    # Check length
    valid, reason = check_comment_length(content)
    if not valid:
        return "rejected", reason

    # Check links
    has_too_many_links, reason = check_link_count(content)
    if has_too_many_links:
        return "pending", reason

    # Check keywords
    has_keywords, reason = check_keywords(content, keywords)
    if has_keywords:
        return "pending", reason

    return "approved", ""
