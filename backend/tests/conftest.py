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


@pytest.fixture
def csrf_headers():
    """Get CSRF headers by first making a GET request to set the csrf cookie.

    Returns a dict with X-CSRF-Token header, or empty dict if cookie not set.
    """
    from fastapi.testclient import TestClient
    from middleware import CSRF_COOKIE_NAME

    def _get(client: TestClient) -> dict:
        if CSRF_COOKIE_NAME not in client.cookies:
            client.get("/api/posts")
        csrf_signed = client.cookies.get(CSRF_COOKIE_NAME)
        if not csrf_signed:
            return {}
        csrf_token = csrf_signed.rsplit(".", 1)[0] if "." in csrf_signed else csrf_signed
        return {"X-CSRF-Token": csrf_token}

    return _get
