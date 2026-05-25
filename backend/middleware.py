"""Security middleware: CSRF protection, security headers, and rate limiting behind reverse proxy."""

import hashlib
import hmac
import logging
import os
import secrets
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

logger = logging.getLogger(__name__)

CSRF_SECRET = os.environ.get("CSRF_SECRET")
if not CSRF_SECRET:
    logger.warning("CSRF_SECRET is not set. Generated a random secret for this process; CSRF tokens expire on restart.")
    CSRF_SECRET = secrets.token_hex(32)
CSRF_COOKIE_NAME = "csrf_token"
CSRF_HEADER_NAME = "x-csrf-token"
SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


def _is_secure_request(request: Request) -> bool:
    forwarded_proto = request.headers.get("x-forwarded-proto")
    if forwarded_proto:
        return forwarded_proto.split(",")[0].strip().lower() == "https"
    return request.url.scheme == "https"


def generate_csrf_token() -> str:
    """Generate a new CSRF token."""
    return secrets.token_urlsafe(32)


def _sign_token(token: str) -> str:
    """Sign a CSRF token so it can be validated."""
    sig = hmac.new(CSRF_SECRET.encode(), token.encode(), hashlib.sha256).hexdigest()
    return f"{token}.{sig}"


def _verify_token(signed: str) -> bool:
    """Verify a signed CSRF token."""
    if "." not in signed:
        return False
    token, sig = signed.rsplit(".", 1)
    expected = hmac.new(CSRF_SECRET.encode(), token.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(sig, expected)


class CSRFMiddleware(BaseHTTPMiddleware):
    """CSRF protection using double-submit cookie pattern.

    - On safe methods (GET/HEAD/OPTIONS), sets a csrf_token cookie if not present.
    - On unsafe methods (POST/PUT/DELETE/PATCH), validates the cookie against the header.
    """

    async def dispatch(self, request: Request, call_next):
        if request.method in SAFE_METHODS:
            response = await call_next(request)
            # Set CSRF cookie if not already present
            if CSRF_COOKIE_NAME not in request.cookies:
                token = generate_csrf_token()
                signed = _sign_token(token)
                response.set_cookie(
                    CSRF_COOKIE_NAME, signed,
                    httponly=False,  # JS needs to read it
                    secure=_is_secure_request(request),
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

        cookie_token_raw = cookie_token.rsplit(".", 1)[0]
        if not hmac.compare_digest(cookie_token_raw, header_token):
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
        if _is_secure_request(request):
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        if not request.url.path.startswith(("/docs", "/redoc", "/openapi.json", "/docs/oauth2-redirect")):
            # Relaxed CSP for API backend (no inline scripts needed)
            response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"
        return response
