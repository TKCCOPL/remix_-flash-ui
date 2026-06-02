import hashlib
import hmac
import secrets

from fastapi.testclient import TestClient
from main import app
from middleware import (
    CSRF_COOKIE_NAME,
    CSRF_HEADER_NAME,
    generate_csrf_token,
    _sign_token,
    _verify_token,
)


class TestCSRFTokenUtilities:
    def test_generate_csrf_token_length(self):
        token = generate_csrf_token()
        assert len(token) == 43

    def test_sign_and_verify(self):
        token = generate_csrf_token()
        signed = _sign_token(token)
        assert "." in signed
        assert _verify_token(signed) is True

    def test_verify_tampered_token(self):
        token = generate_csrf_token()
        signed = _sign_token(token)
        tampered = signed[:-1] + ("a" if signed[-1] != "a" else "b")
        assert _verify_token(tampered) is False

    def test_verify_token_without_dot(self):
        assert _verify_token("no_dot_here") is False

    def test_verify_tampered_raw_part(self):
        token = generate_csrf_token()
        signed = _sign_token(token)
        parts = signed.split(".")
        tampered = generate_csrf_token() + "." + parts[1]
        assert _verify_token(tampered) is False


class TestCSRFKeyRotation:
    def test_sign_with_primary_verify_with_primary(self):
        """Tokens signed with primary secret should always verify."""
        token = generate_csrf_token()
        signed = _sign_token(token)
        assert _verify_token(signed) is True

    def test_verify_with_fallback_secret(self):
        """Tokens signed with an old (fallback) secret should still verify."""
        import middleware
        original = middleware.CSRF_SECRETS[:]
        try:
            # Simulate: primary is "new_key", fallback is the old primary
            old_secret = secrets.token_hex(32)
            middleware.CSRF_SECRETS = [secrets.token_hex(32), old_secret]
            # Sign with old secret
            token = generate_csrf_token()
            sig = hmac.new(old_secret.encode(), token.encode(), hashlib.sha256).hexdigest()
            signed = f"{token}.{sig}"
            # Should still verify because old_secret is in fallbacks
            assert _verify_token(signed) is True
        finally:
            middleware.CSRF_SECRETS = original

    def test_sign_always_uses_primary(self):
        """New tokens should always be signed with the primary (first) secret."""
        import middleware
        original = middleware.CSRF_SECRETS[:]
        try:
            primary = secrets.token_hex(32)
            fallback = secrets.token_hex(32)
            middleware.CSRF_SECRETS = [primary, fallback]
            token = generate_csrf_token()
            signed = _sign_token(token)
            # Verify the signature was made with primary
            raw, sig = signed.rsplit(".", 1)
            expected = hmac.new(primary.encode(), token.encode(), hashlib.sha256).hexdigest()
            assert hmac.compare_digest(sig, expected)
        finally:
            middleware.CSRF_SECRETS = original


class TestCSRFMiddlewareSafeMethods:
    def test_get_without_cookie_sets_cookie(self):
        client = TestClient(app)
        response = client.get("/api/posts")
        assert response.status_code == 200
        set_cookie = response.headers.get("set-cookie")
        assert set_cookie is not None
        assert CSRF_COOKIE_NAME in set_cookie

    def test_get_with_existing_cookie_does_not_overwrite(self):
        client = TestClient(app, cookies={CSRF_COOKIE_NAME: "existing_token.signature"})
        response = client.get("/api/posts")
        assert response.status_code == 200
        set_cookie = response.headers.get("set-cookie")
        assert set_cookie is None or CSRF_COOKIE_NAME not in set_cookie

    def test_head_request_is_safe(self):
        client = TestClient(app)
        response = client.head("/api/categories")
        assert response.status_code != 403, "HEAD should not be blocked by CSRF"

    def test_options_request_is_safe(self):
        client = TestClient(app)
        response = client.options("/api/posts")
        assert response.status_code != 403, "OPTIONS should not be blocked by CSRF"


class TestCSRFMiddlewareUnsafeMethods:
    def test_post_without_cookie_returns_403(self):
        client = TestClient(app)
        response = client.post("/api/auth/login", data={"username": "a", "password": "b"})
        assert response.status_code == 403
        assert response.json()["detail"] == "CSRF token missing"

    def test_post_without_header_returns_403(self):
        client = TestClient(app, cookies={CSRF_COOKIE_NAME: "some_token.sig"})
        response = client.post("/api/auth/login", data={"username": "a", "password": "b"})
        assert response.status_code == 403
        assert response.json()["detail"] == "CSRF token missing"

    def test_post_with_invalid_cookie_signature_returns_403(self):
        client = TestClient(
            app,
            cookies={CSRF_COOKIE_NAME: "fake_token.bad_signature"},
            headers={CSRF_HEADER_NAME: "fake_token"},
        )
        response = client.post("/api/auth/login", data={"username": "a", "password": "b"})
        assert response.status_code == 403
        assert response.json()["detail"] == "CSRF token invalid"

    def test_post_with_valid_token_passes_csrf(self):
        raw_token = generate_csrf_token()
        signed_token = _sign_token(raw_token)

        client = TestClient(
            app,
            cookies={CSRF_COOKIE_NAME: signed_token},
            headers={CSRF_HEADER_NAME: raw_token},
        )
        response = client.post(
            "/api/auth/login",
            data={"username": "admin", "password": "123456"},
        )
        # CSRF passes; login succeeds with valid credentials
        assert response.status_code == 200
        assert response.json()["ok"] is True

    def test_post_with_mismatched_tokens_returns_403(self):
        raw_token = generate_csrf_token()
        signed_token = _sign_token(raw_token)
        other_token = generate_csrf_token()

        client = TestClient(
            app,
            cookies={CSRF_COOKIE_NAME: signed_token},
            headers={CSRF_HEADER_NAME: other_token},
        )
        response = client.post("/api/auth/login", data={"username": "a", "password": "b"})
        assert response.status_code == 403
        assert response.json()["detail"] == "CSRF token mismatch"

    def test_delete_without_csrf_returns_403(self):
        client = TestClient(app)
        response = client.delete("/api/posts/1")
        assert response.status_code == 403

    def test_put_without_csrf_returns_403(self):
        client = TestClient(app)
        response = client.put("/api/posts/1")
        assert response.status_code == 403

    def test_patch_without_csrf_returns_403(self):
        client = TestClient(app)
        response = client.patch("/api/posts/1")
        assert response.status_code == 403


class TestSecurityHeadersMiddleware:
    def test_security_headers_on_non_secure_request(self):
        client = TestClient(app)
        response = client.get("/api/posts")
        assert response.headers.get("X-Content-Type-Options") == "nosniff"
        assert response.headers.get("X-Frame-Options") == "DENY"
        assert response.headers.get("X-XSS-Protection") == "1; mode=block"
        assert response.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"
        assert response.headers.get("Permissions-Policy") == "camera=(), microphone=(), geolocation=()"

    def test_hsts_header_on_secure_request(self):
        client = TestClient(app, headers={"x-forwarded-proto": "https"})
        response = client.get("/api/posts")
        assert "Strict-Transport-Security" in response.headers
        assert "max-age=31536000" in response.headers["Strict-Transport-Security"]

    def test_no_hsts_header_on_insecure_request(self):
        client = TestClient(app)
        response = client.get("/api/posts")
        assert "Strict-Transport-Security" not in response.headers

    def test_csp_header_on_api_routes(self):
        client = TestClient(app)
        response = client.get("/api/posts")
        assert "Content-Security-Policy" in response.headers
        assert response.headers["Content-Security-Policy"] == "default-src 'none'; frame-ancestors 'none'"

    def test_no_csp_header_on_docs_routes(self):
        client = TestClient(app)
        response = client.get("/docs")
        assert "Content-Security-Policy" not in response.headers



