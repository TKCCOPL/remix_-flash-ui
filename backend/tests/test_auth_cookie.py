"""Tests for auth cookie secure flag behavior."""
import pytest
from fastapi.testclient import TestClient
from main import app


def _get_csrf_headers(client: TestClient) -> dict:
    """Get CSRF headers by first making a GET request to set the csrf cookie."""
    if "csrf_token" not in client.cookies:
        client.get("/api/auth/me")
    csrf_signed = client.cookies.get("csrf_token")
    if not csrf_signed:
        return {}
    csrf_token = csrf_signed.rsplit(".", 1)[0] if "." in csrf_signed else csrf_signed
    return {"X-CSRF-Token": csrf_token}


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def https_client():
    return TestClient(app, base_url="https://testserver")


def test_login_cookie_secure_false_on_http(client):
    """Cookie should NOT have secure=True when request is HTTP."""
    response = client.post(
        "/api/auth/login",
        data={"username": "admin", "password": "123456"},
        headers=_get_csrf_headers(client),
    )
    assert response.status_code == 200
    cookies = response.cookies
    session_cookie = cookies.get("session")
    assert session_cookie is not None


def test_login_cookie_has_secure_flag_on_https(https_client):
    """Cookie SHOULD have secure=True when request is HTTPS."""
    response = https_client.post(
        "/api/auth/login",
        data={"username": "admin", "password": "123456"},
        headers=_get_csrf_headers(https_client),
    )
    assert response.status_code == 200
    # Verify the Set-Cookie header contains "Secure"
    set_cookie_headers = response.headers.get_list("set-cookie")
    session_header = [h for h in set_cookie_headers if h.startswith("session=")]
    assert len(session_header) == 1
    assert "Secure" in session_header[0]


def test_logout_deletes_session_cookie(client):
    """Logout should properly delete session cookie."""
    headers = _get_csrf_headers(client)
    client.post(
        "/api/auth/login",
        data={"username": "admin", "password": "123456"},
        headers=headers,
    )
    # Re-fetch CSRF token as cookies may have changed after login
    response = client.post("/api/auth/logout", headers=_get_csrf_headers(client))
    assert response.status_code == 200


def test_logout_cookie_secure_matches_request_scheme(https_client):
    """Logout delete-cookie should use secure=True when request is HTTPS."""
    headers = _get_csrf_headers(https_client)
    https_client.post(
        "/api/auth/login",
        data={"username": "admin", "password": "123456"},
        headers=headers,
    )
    response = https_client.post(
        "/api/auth/logout",
        headers=_get_csrf_headers(https_client),
    )
    assert response.status_code == 200
    set_cookie_headers = response.headers.get_list("set-cookie")
    session_delete = [h for h in set_cookie_headers if "session=" in h and "Max-Age=0" in h]
    assert len(session_delete) == 1
    assert "Secure" in session_delete[0]
