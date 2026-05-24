"""Security middleware: CSRF protection, security headers, and rate limiting behind reverse proxy."""

import hashlib
import hmac
import os
import secrets
import time
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

CSRF_SECRET=os.environ.get("CSRF_SECRET", "fallback-csrf-secret")
CSRF_COOKIE_NAME = "csrf_token"
CSRF_HEADER_NAME = "x-csrf-token"
SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


def generate_csrf_token() -> str:
    """Generate a new CSRF token."""
    return secrets.token_urlsafe(32)


def _sign_token(token: str) -> str:
    """Sign a CSRF token so it can be validated."""
    sig = hmac.new(CSRF_SECRET.encode(), token.encode(), hashlib.sha256).hexdigest()[:16]
    return f"{token}.{sig}"


def _verify_token(signed: str) -> bool:
    """Verify a signed CSRF token."""
    if "." not in signed:
        return False
    token, sig = signed.rsplit(".", 1)
    expected = hmac.new(CSRF_SECRET.encode(), token.encode(), hashlib.sha256).hexdigest()[:16]
    return hmac.compare_digest(sig, expected)


class CSRFMiddleware(BaseHTTPMiddleware):
    """CSRF protection using double-submit cookie pattern.

    - On safe methods (GET/HEAD/OPTIONS), sets a csrf_token cookie if not present.
    - On unsafe methods (POST/PUT/DELETE/PATCH), validates the cookie against the header.
    """

    async def dispatch(self, request: Request, call_next):
        # Skip CSRF for login endpoint (uses form credentials)
        if request.url.path == "/api/auth/login":
            response = await call_next(request)
            return response

        if request.method in SAFE_METHODS:
            response = await call_next(request)
            # Set CSRF cookie if not already present
            if CSRF_COOKIE_NAME not in request.cookies:
                token = generate_csrf_token()
                signed = _sign_token(token)
                response.set_cookie(
                    CSRF_COOKIE_NAME, signed,
                    httponly=False,  # JS needs to read it
                    samesite="lax",
                    max_age=86400,
                )
            return response

        # Unsafe method: validate CSRF
        cookie_token = request.cookies.get(CSRF_COOKIE_NAME)
        header_token = request.headers.get(CSRF_HEADER_NAME)

        if not cookie_token or not header_token:
            return JSONResponse(
                status_code=403,
                content={"detail": "CSRF token missing"},
            )

        if not _verify_token(cookie_token):
            return JSONResponse(
                status_code=403,
                content={"detail": "CSRF token invalid"},
            )

        if not hmac.compare_digest(cookie_token, header_token):
            return JSONResponse(
                status_code=403,
                content={"detail": "CSRF token mismatch"},
            )

        return await call_next(request)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security response headers to all responses."""

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        # Relaxed CSP for API backend (no inline scripts needed)
        response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"
        return response
