"""Shared utility functions for the backend."""


def escape_like(val: str) -> str:
    """Escape special LIKE characters % _ and \\ for SQLite."""
    return val.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
