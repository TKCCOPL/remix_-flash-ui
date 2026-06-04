# OAuth Login Security Fix Plan

**Branch:** `fix/oauth-security-hardening` (based on `fix/csrf-security-hardening`)
**Goal:** Fix all OAuth login security issues — exception handling, PKCE, token exchange, config validation.

---

### Task 1: Fix `verify_guest_token` Exception Handling (P1)

**Objective:** Replace `except Exception: pass` with proper fail-closed logging.

**Files:**
- Modify: `backend/services/oauth_service.py:70-71`

**Change:**
```python
# BEFORE (line 70-71):
            except Exception:
                pass

# AFTER:
            except Exception as e:
                logger.error(f"Guest token blacklist DB check failed: {e}")
                return None  # Fail-closed: DB unavailable = reject token
```

**Verify:** `pytest tests/test_oauth_service.py -v`

**Commit:** `fix: fail-closed on DB error in verify_guest_token`

---

### Task 2: GitHub Token Exchange Error Handling (P1)

**Objective:** Detect GitHub's HTTP-200-with-error-in-body pattern and return meaningful error messages.

**Source:** authlib `parse_response_token` — check `"error"` in JSON body regardless of HTTP status.

**Files:**
- Modify: `backend/oauth_providers.py:36-49` (GitHubProvider.exchange_code_for_token)
- Modify: `backend/oauth_providers.py:81-95` (GiteeProvider.exchange_code_for_token)

**Change for GitHubProvider:**
```python
async def exchange_code_for_token(self, code: str, code_verifier: str | None = None) -> tuple[str | None, str | None]:
    """Exchange authorization code for access token.
    
    Returns: (access_token, error_description) — one is None.
    Handles GitHub's known bug: HTTP 200 with error in JSON body.
    """
    data = {
        "client_id": GITHUB_CLIENT_ID,
        "client_secret": GITHUB_CLIENT_SECRET,
        "code": code,
    }
    if code_verifier:
        data["code_verifier"] = code_verifier
    
    async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
        resp = await client.post(
            "https://github.com/login/oauth/access_token",
            data=data,
            headers={"Accept": "application/json"},
        )
        resp.raise_for_status()
        body = resp.json()
        
        # GitHub returns HTTP 200 with error in body (known bug)
        if "error" in body:
            return None, body.get("error_description", body["error"])
        
        return body.get("access_token"), None
```

**Change for GiteeProvider:** Same pattern but Gitee uses standard HTTP errors:
```python
async def exchange_code_for_token(self, code: str, code_verifier: str | None = None) -> tuple[str | None, str | None]:
    async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
        resp = await client.post(
            "https://gitee.com/oauth/token",
            data={
                "grant_type": "authorization_code",
                "client_id": GITEE_CLIENT_ID,
                "client_secret": GITEE_CLIENT_SECRET,
                "code": code,
                "redirect_uri": GITEE_REDIRECT_URI,
            },
        )
        body = resp.json()
        if "error" in body:
            return None, body.get("error_description", body["error"])
        resp.raise_for_status()
        return body.get("access_token"), None
```

**Update oauth_router.py:91-93** to use new return type:
```python
access_token, error = await oauth_provider.exchange_code_for_token(code)
if not access_token:
    raise HTTPException(status_code=400, detail=f"OAuth token exchange failed: {error or 'unknown error'}")
```

**Verify:** `pytest tests/test_oauth_providers.py tests/test_oauth_integration.py -v`

**Commit:** `fix: handle GitHub 200-with-error token exchange pattern`

---

### Task 3: PKCE for GitHub OAuth (P1)

**Objective:** Add PKCE support for GitHub (S256). Gitee does not support PKCE — skip.

**Source:** GitHub Blog 2025-07-14, RFC 7636.

**Files:**
- Modify: `backend/oauth_providers.py` — add PKCE generation, update `get_authorize_url` and `exchange_code_for_token`
- Modify: `backend/routers/oauth_router.py` — store code_verifier with state, pass to callback
- Modify: `backend/database.py` — add `code_verifier` column to `oauth_states`

**Changes to oauth_providers.py:**
```python
import hashlib
import base64
import secrets as _secrets
import string

def generate_pkce_pair() -> tuple[str, str]:
    """Generate PKCE code_verifier and code_challenge (S256)."""
    code_verifier = ''.join(_secrets.choice(string.ascii_letters + string.digits + '-._~') for _ in range(128))
    digest = hashlib.sha256(code_verifier.encode('ascii')).digest()
    code_challenge = base64.urlsafe_b64encode(digest).rstrip(b'=').decode('ascii')
    return code_verifier, code_challenge
```

**Update OAuthProvider ABC:**
```python
class OAuthProvider(ABC):
    supports_pkce: bool = False
    
    @abstractmethod
    def get_authorize_url(self, state: str, code_challenge: str | None = None) -> str:
        pass
    
    @abstractmethod
    async def exchange_code_for_token(self, code: str, code_verifier: str | None = None) -> tuple[str | None, str | None]:
        pass
```

**Update GitHubProvider:**
```python
class GitHubProvider(OAuthProvider):
    supports_pkce = True
    
    def get_authorize_url(self, state: str, code_challenge: str | None = None) -> str:
        url = (
            f"https://github.com/login/oauth/authorize"
            f"?client_id={GITHUB_CLIENT_ID}"
            f"&redirect_uri={GITHUB_REDIRECT_URI}"
            f"&scope=read:user user:email"
            f"&state={state}"
        )
        if code_challenge:
            url += f"&code_challenge={code_challenge}&code_challenge_method=S256"
        return url
```

**Update oauth_router.py — store code_verifier with state:**
```python
@router.get("/{provider}")
async def oauth_login(provider: str, ...):
    ...
    code_verifier = None
    code_challenge = None
    if oauth_provider.supports_pkce:
        code_verifier, code_challenge = generate_pkce_pair()
    
    state = secrets.token_urlsafe(32)
    cursor.execute(
        "INSERT INTO oauth_states (state, provider, code_verifier) VALUES (?, ?, ?)",
        (state, provider, code_verifier)
    )
    conn.commit()
    
    authorize_url = oauth_provider.get_authorize_url(state, code_challenge)
    return RedirectResponse(url=authorize_url)
```

**Update callback to retrieve code_verifier:**
```python
@router.get("/{provider}/callback")
async def oauth_callback(...):
    cursor.execute("SELECT provider, code_verifier FROM oauth_states WHERE state = ?", (state,))
    row = cursor.fetchone()
    ...
    code_verifier = row["code_verifier"] if row else None
    access_token, error = await oauth_provider.exchange_code_for_token(code, code_verifier)
```

**Database migration in `backend/database.py`:**

Find the auto-migration section (around line 68, after the existing `oauth_states` CREATE TABLE), and add:
```python
# ── OAuth PKCE migration ────────────────────────────────────────────────
cursor.execute("PRAGMA table_info(oauth_states)")
oauth_columns = {row[1] for row in cursor.fetchall()}
if "code_verifier" not in oauth_columns:
    cursor.execute("ALTER TABLE oauth_states ADD COLUMN code_verifier TEXT")
```

**Update tests in `backend/tests/test_oauth_providers.py`:**
```python
def test_github_supports_pkce():
    provider = GitHubProvider()
    assert provider.supports_pkce is True

def test_gitee_does_not_support_pkce():
    provider = GiteeProvider()
    assert provider.supports_pkce is False

def test_github_authorize_url_with_pkce():
    provider = GitHubProvider()
    url = provider.get_authorize_url('test_state', code_challenge='abc123')
    assert 'code_challenge=abc123' in url
    assert 'code_challenge_method=S256' in url

def test_github_authorize_url_without_pkce():
    provider = GitHubProvider()
    url = provider.get_authorize_url('test_state')
    assert 'code_challenge' not in url
```

**Verify:** `pytest tests/test_oauth_providers.py tests/test_oauth_integration.py -v`

**Commit:** `feat: add PKCE support for GitHub OAuth`

---

### Task 4: Config Validation + Default Fix (P2)

**Objective:** Validate OAuth config at startup, fix default port.

**Files:**
- Modify: `backend/config.py:13-19`

**Change:**
```python
GITHUB_REDIRECT_URI = os.environ.get("GITHUB_REDIRECT_URI", "http://localhost:8001/api/oauth/github/callback")
GITEE_REDIRECT_URI=os.env...001/api/oauth/gitee/callback")

# Validate required OAuth config
for var_name in ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET", "GITEE_CLIENT_ID", "GITEE_CLIENT_SECRET"]:
    if not os.environ.get(var_name):
        logger.warning(f"{var_name} is not set. OAuth login for this provider will fail.")
```

**Commit:** `fix: OAuth config validation + correct default port`

---

### Task 5: get_user_info Error Handling (P3)

**Objective:** Handle missing fields in OAuth user info responses.

**Files:**
- Modify: `backend/oauth_providers.py:60-67, 97-110`

**Change:**
```python
async def get_user_info(self, access_token: str) -> dict | None:
    async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
        resp = await client.get(...)
        resp.raise_for_status()
        data = resp.json()
        if not data.get("id"):
            return None
        return {
            "oauth_id": str(data["id"]),
            "username": data.get("login", "unknown"),
            "avatar_url": data.get("avatar_url"),
            "email": data.get("email"),
        }
```

**Commit:** `fix: handle missing fields in OAuth user info`

---

### Task 6: Full Regression Test

**Run:** `cd backend && pytest -v` + `cd frontend && npm run build`

---

## Not in Scope (for this PR)

| Item | Reason |
|---|---|
| GUEST_JWT_SECRET rotation | Same pattern as CSRF; separate PR |
| oauth_states UTC migration | SQLite CURRENT_TIMESTAMP is already UTC; low risk |
| Token verification DB caching | Performance optimization; separate PR |
| Admin session clear on guest login | Intentional design; document in code |

## Verification Checklist

- [ ] `verify_guest_token` returns None on DB error (fail-closed)
- [ ] GitHub 200-with-error returns meaningful message
- [ ] PKCE code_verifier stored with oauth_states
- [ ] GitHub authorize URL includes code_challenge
- [ ] GitHub token exchange includes code_verifier
- [ ] Gitee flow unchanged (no PKCE)
- [ ] Default REDIRECT_URI uses port 8001
- [ ] Missing OAuth config logs warning at startup
- [ ] get_user_info handles missing fields
- [ ] All tests pass
