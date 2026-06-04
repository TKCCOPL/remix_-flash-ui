# CSRF Security Hardening Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Fix all CSRF security issues discovered in deep audit — key rotation, startup validation, cookie hardening, and frontend race condition.

**Architecture:** Keep the existing Signed Double-Submit Cookie pattern (HMAC-SHA256). Add multi-secret support for key rotation, enforce minimum key length at startup, harden cookie attributes (explicit path), and add frontend CSRF cookie prefetch + 403 retry.

**Tech Stack:** Python HMAC/Starlette middleware, TypeScript fetch API

**Branch:** `fix/csrf-security-hardening` (based on `bugfix/code-review-fixes` @ `e8a5c55`)

---

### Task 1: Multi-Secret CSRF Key Rotation (Backend)

**Objective:** Support multiple CSRF secrets (primary + fallbacks) so keys can be rotated without invalidating all existing tokens.

**Files:**
- Modify: `backend/middleware.py:14-52`
- Test: `backend/tests/test_middleware.py`

**Step 1: Write failing tests**

Add these imports at the top of `test_middleware.py` (line 1-9) if not already present:
```python
import hashlib
import hmac
import secrets
```

Then add after the existing `TestCSRFTokenUtilities` class:

```python
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
```

**Step 2: Run tests to verify failure**

Run: `cd /root/.hermes/remix_-flash-ui/backend && .venv/bin/python -m pytest tests/test_middleware.py::TestCSRFKeyRotation -v`
Expected: FAIL — `CSRF_SECRETS` doesn't exist yet

**Step 3: Implement multi-secret support**

Replace `backend/middleware.py:14-52` with:

```python
import sys

# ── CSRF Secret Loading ────────────────────────────────────────────────────
# Primary secret signs new tokens. Fallbacks verify old tokens during rotation.
# Rotation process:
#   1. Deploy with CSRF_SECRET=<new>, CSRF_SECRET_FALLBACKS=<old>
#   2. Wait grace period (e.g., 24h for max_age to expire old cookies)
#   3. Deploy with CSRF_SECRET=<new>, CSRF_SECRET_FALLBACKS=<empty>
CSRF_SECRET = os.environ.get("CSRF_SECRET")
CSRF_SECRET_FALLBACKS = os.environ.get("CSRF_SECRET_FALLBACKS", "")

if not CSRF_SECRET:
    logger.warning(
        "CSRF_SECRET is NOT set. Generated a random secret for this process. "
        "All CSRF tokens will become invalid on restart. "
        "Set CSRF_SECRET in your .env or environment for production."
    )
    CSRF_SECRET = secrets.token_hex(32)

if len(CSRF_SECRET) < 32:
    logger.critical(
        f"CSRF_SECRET is too short ({len(CSRF_SECRET)} chars, minimum 32). "
        "NIST SP 800-57 requires >= 256 bits (32 bytes) for HMAC-SHA256. "
        "Generate one: python -c \"import secrets; print(secrets.token_hex(32))\""
    )
    sys.exit(1)

# Build secrets list: [primary, fallback1, fallback2, ...]
CSRF_SECRETS: list[str] = [CSRF_SECRET] + [
    s.strip() for s in CSRF_SECRET_FALLBACKS.split(",") if s.strip()
]

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
    """Sign a CSRF token with the PRIMARY secret (newest key)."""
    sig = hmac.new(CSRF_SECRETS[0].encode(), token.encode(), hashlib.sha256).hexdigest()
    return f"{token}.{sig}"


def _verify_token(signed: str) -> bool:
    """Verify a signed CSRF token against ALL secrets (primary + fallbacks)."""
    if "." not in signed:
        return False
    token, sig = signed.rsplit(".", 1)
    for secret in CSRF_SECRETS:
        expected = hmac.new(secret.encode(), token.encode(), hashlib.sha256).hexdigest()
        if hmac.compare_digest(sig, expected):
            return True
    return False
```

Also add `import sys` at the top of `middleware.py` (after `import secrets`).

**Step 4: Run tests to verify pass**

Run: `cd /root/.hermes/remix_-flash-ui/backend && .venv/bin/python -m pytest tests/test_middleware.py -v`
Expected: ALL PASS (existing tests + new rotation tests)

**Step 5: Commit**

```bash
git add backend/middleware.py backend/tests/test_middleware.py
git commit -m "feat: CSRF multi-secret key rotation + startup validation"
```

---

### Task 2: Update .env.example with CSRF_SECRET_FALLBACKS

**Objective:** Document the new fallback secret configuration.

**Files:**
- Modify: `backend/.env.example:9-11`

**Step 1: Update .env.example**

Replace lines 9-11 with:

```
# CSRF signing secret (required in production; generate a 32+ char random string)
# e.g., run `python -c "import secrets; print(secrets.token_hex(32))"`
CSRF_SECRET=your_random_64_char_string_here

# Optional: comma-separated old secrets for key rotation (grace period)
# CSRF_SECRET_FALLBACKS=old_secret_1,old_secret_2
```

**Step 2: Commit**

```bash
git add backend/.env.example
git commit -m "docs: add CSRF_SECRET_FALLBACKS to .env.example"
```

---

### Task 3: Cookie Hardening — Explicit Path + SameSite Documentation

**Objective:** Ensure CSRF cookie has explicit `path="/"` and document the security attributes.

**Files:**
- Modify: `backend/middleware.py:69-75` (cookie set_cookie call)

**Step 1: Write failing test**

Add to `backend/tests/test_middleware.py`:

```python
class TestCSRFCookieAttributes:
    def test_cookie_has_explicit_attributes(self):
        """CSRF cookie must have correct security attributes."""
        client = TestClient(app)
        response = client.get("/api/posts")
        set_cookie = response.headers.get("set-cookie", "")
        # Starlette defaults path="/", but we set it explicitly for clarity
        assert CSRF_COOKIE_NAME in set_cookie
        assert "samesite=lax" in set_cookie.lower()
        assert "httponly" not in set_cookie.lower()

    def test_cookie_secure_on_https(self):
        """CSRF cookie must have Secure flag on HTTPS requests."""
        client = TestClient(app, headers={"x-forwarded-proto": "https"})
        response = client.get("/api/posts")
        set_cookie = response.headers.get("set-cookie", "")
        assert "secure" in set_cookie.lower()
```

**Step 2: Run tests to verify failure**

Run: `cd /root/.hermes/remix_-flash-ui/backend && .venv/bin/python -m pytest tests/test_middleware.py::TestCSRFCookieAttributes -v`
Expected: ALL PASS (Starlette already defaults path=/ and samesite=lax; these tests validate attributes are correct)

**Step 3: Add explicit `path="/"` to set_cookie**

In `backend/middleware.py:69-75`, change:

```python
                response.set_cookie(
                    CSRF_COOKIE_NAME, signed,
                    httponly=False,  # JS needs to read it
                    secure=_is_secure_request(request),
                    samesite="lax",
                    max_age=86400,
                )
```

To:

```python
                response.set_cookie(
                    CSRF_COOKIE_NAME, signed,
                    httponly=False,  # JS needs to read it for double-submit
                    secure=_is_secure_request(request),
                    samesite="lax",
                    max_age=86400,
                    path="/",  # Explicit: cookie available on all paths
                )
```

**Step 4: Run tests to verify pass**

Run: `cd /root/.hermes/remix_-flash-ui/backend && .venv/bin/python -m pytest tests/test_middleware.py -v`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add backend/middleware.py backend/tests/test_middleware.py
git commit -m "fix: add explicit path=/ to CSRF cookie"
```

---

### Task 4: Frontend CSRF Cookie Prefetch + 403 Auto-Retry

**Objective:** Fix the race condition where the first POST fails because no CSRF cookie exists yet. Add automatic CSRF cookie prefetch and 403 retry.

**Files:**
- Modify: `frontend/api/client.ts:44-94`

**Step 1: Add `ensureCsrfCookie` helper and modify `apiFetch`**

Replace `frontend/api/client.ts:44-94` with:

```typescript
/**
 * Ensure the CSRF cookie is set by making a lightweight HEAD request.
 * The backend middleware sets the cookie on any safe method response.
 */
async function ensureCsrfCookie(): Promise<void> {
  if (getCookieValue(CSRF_COOKIE_NAME)) return;
  try {
    await fetch(resolveApiUrl('/api/posts'), {
      method: 'HEAD',
      credentials: 'include',
      cache: 'no-store',
    });
  } catch {
    // Best effort — if this fails, the main request will surface the error
  }
}

/**
 * Extract the raw token from a signed CSRF cookie value.
 * Cookie format: "{raw_token}.{hmac_signature}"
 */
function extractRawCsrfToken(signedToken: string): string {
  const lastDot = signedToken.lastIndexOf('.');
  return lastDot > 0 ? signedToken.substring(0, lastDot) : signedToken;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  const method = (init?.method ?? 'GET').toUpperCase();
  if (!headers.has('Content-Type') && shouldUseJsonContentType(init?.body)) {
    headers.set('Content-Type', 'application/json');
  }

  // For unsafe methods, ensure CSRF cookie exists and inject header
  if (!SAFE_METHODS.has(method)) {
    await ensureCsrfCookie();
    const csrfToken = getCookieValue(CSRF_COOKIE_NAME);
    if (csrfToken && !headers.has(CSRF_HEADER_NAME)) {
      headers.set(CSRF_HEADER_NAME, extractRawCsrfToken(csrfToken));
    }
  }

  const response = await fetch(resolveApiUrl(path), {
    credentials: 'include',
    cache: 'no-store',
    ...init,
    headers,
  });

  const contentType = response.headers.get('content-type') ?? '';

  // Auto-retry on CSRF failure (token may have expired or rotated)
  if (response.status === 403 && !SAFE_METHODS.has(method)) {
    try {
      const body = await response.clone().json().catch(() => null);
      if (body?.detail?.includes('CSRF')) {
        // Force-refresh: make a HEAD request to get a fresh CSRF cookie
        // (the backend will set a new cookie signed with the current secret)
        await fetch(resolveApiUrl('/api/posts'), {
          method: 'HEAD',
          credentials: 'include',
          cache: 'no-store',
        });
        // Re-read the (possibly refreshed) cookie and retry
        const freshToken = getCookieValue(CSRF_COOKIE_NAME);
        if (freshToken) {
          headers.set(CSRF_HEADER_NAME, extractRawCsrfToken(freshToken));
        }
        // Retry once with fresh token
        const retryResponse = await fetch(resolveApiUrl(path), {
          credentials: 'include',
          cache: 'no-store',
          ...init,
          headers,
        });
        if (retryResponse.ok) {
          // Fall through to normal response handling with retryResponse
          return handleResponse<T>(retryResponse);
        }
      }
    } catch {
      // Retry failed, fall through to normal error handling
    }
  }

  return handleResponse<T>(response);
}

async function handleResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') ?? '';

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    if (contentType.includes('application/json')) {
      const data = (await response.json()) as { detail?: string };
      if (typeof data.detail === 'string' && data.detail.trim()) {
        message = data.detail;
      }
    } else {
      const text = await response.text();
      if (text.trim()) {
        message = text;
      }
    }
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  if (!contentType.includes('application/json')) {
    throw new ApiError(response.status, `Invalid response content type (HTTP ${response.status})`);
  }

  return (await response.json()) as T;
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd /root/.hermes/remix_-flash-ui/frontend && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

**Step 3: Verify build passes**

Run: `cd /root/.hermes/remix_-flash-ui/frontend && npm run build 2>&1 | tail -5`
Expected: Build success

**Step 4: Commit**

```bash
git add frontend/api/client.ts
git commit -m "fix: CSRF cookie prefetch + 403 auto-retry in apiFetch"
```

---

### Task 5: Extract Test Helper + Update Existing Tests

**Objective:** DRY up the duplicated `_get_csrf_headers` helper across 4 test files by extracting to conftest.py.

**Files:**
- Modify: `backend/tests/conftest.py`
- Modify: `backend/tests/test_auth_cookie.py`
- Modify: `backend/tests/test_oauth_integration.py`
- Modify: `backend/tests/test_admin_users.py`
- Modify: `backend/tests/test_admin_api_workflow.py`

**Step 1: Add shared fixture to conftest.py**

Append to `backend/tests/conftest.py`:

```python
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
```

**Step 2: Verify all existing tests still pass (no regression)**

Run: `cd /root/.hermes/remix_-flash-ui/backend && .venv/bin/python -m pytest tests/test_middleware.py tests/test_auth_cookie.py tests/test_oauth_integration.py tests/test_admin_api_workflow.py -v`
Expected: ALL PASS (we're not changing test behavior, just adding a shared fixture)

**Step 3: Commit**

```bash
git add backend/tests/conftest.py
git commit -m "refactor: extract shared csrf_headers fixture to conftest"
```

Note: Migrating the 4 test files to use the shared fixture is optional and can be done in a follow-up PR to keep this PR focused on security fixes.

---

### Task 6: Full Regression Test

**Objective:** Verify all 156+ existing tests still pass after all CSRF changes.

**Files:** None (verification only)

**Step 1: Run full test suite**

Run: `cd /root/.hermes/remix_-flash-ui/backend && .venv/bin/python -m pytest -v 2>&1 | tail -20`
Expected: All tests pass

**Step 2: Run frontend build**

Run: `cd /root/.hermes/remix_-flash-ui/frontend && npm run build 2>&1 | tail -5`
Expected: Build success

**Step 3: Final commit (if any fixups needed)**

```bash
git add -A
git commit -m "fix: test/build fixups from regression testing"
```

---

## Verification Checklist

After all tasks:

- [ ] `CSRF_SECRETS` list supports primary + fallbacks
- [ ] `_sign_token` uses only primary secret
- [ ] `_verify_token` tries all secrets (primary + fallbacks)
- [ ] Startup fails fast if `CSRF_SECRET` < 32 chars
- [ ] `CSRF_SECRET_FALLBACKS` env var documented in `.env.example`
- [ ] CSRF cookie has explicit `path=/`
- [ ] Frontend `ensureCsrfCookie()` prefetches before first POST
- [ ] Frontend auto-retries on 403 CSRF failure
- [ ] `extractRawCsrfToken()` is DRY (single definition)
- [ ] `handleResponse()` extracted to avoid code duplication
- [ ] All 156+ backend tests pass
- [ ] Frontend TypeScript compiles + builds
- [ ] Shared `csrf_headers` fixture in conftest.py
