import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app, base_url="https://testserver")


def _get_csrf_headers(c: TestClient) -> dict:
    if "csrf_token" not in c.cookies:
        c.get("/api/posts")
    csrf_signed = c.cookies.get("csrf_token")
    if not csrf_signed:
        return {}
    csrf_token = csrf_signed.rsplit(".", 1)[0] if "." in csrf_signed else csrf_signed
    return {"X-CSRF-Token": csrf_token}


def test_oauth_login_redirect():
    response = client.get("/api/oauth/github", follow_redirects=False)
    assert response.status_code == 307
    assert "github.com" in response.headers["location"]


def test_unsupported_provider():
    response = client.get("/api/oauth/unsupported")
    assert response.status_code == 400


def test_comments_without_login():
    anon = TestClient(app, base_url="https://testserver")
    response = anon.post(
        "/api/posts/1/comments",
        json={"content": "test"},
        headers=_get_csrf_headers(anon),
    )
    assert response.status_code == 401


def test_favorite_without_login():
    anon = TestClient(app, base_url="https://testserver")
    response = anon.post(
        "/api/posts/1/favorite",
        headers=_get_csrf_headers(anon),
    )
    assert response.status_code == 401


def test_get_comments():
    response = client.get("/api/posts/1/comments")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
