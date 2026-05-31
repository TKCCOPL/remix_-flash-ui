import os

os.environ.setdefault("ADMIN_USER", "admin")
os.environ.setdefault("ADMIN_PASS", "123456")

import pytest
from limiter import limiter
from main import app


@pytest.fixture(autouse=True)
def _disable_rate_limit():
    """Disable rate limiting in tests to avoid cross-test interference."""
    limiter.enabled = False
    yield
    limiter.enabled = True


@pytest.fixture(autouse=True)
def _clean_dependency_overrides():
    """Clear dependency overrides after each test to prevent cross-test contamination."""
    yield
    app.dependency_overrides.clear()
