import hashlib
import base64
import logging
import secrets as _secrets
import string

import httpx
from abc import ABC, abstractmethod
from config import (
    GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GITHUB_REDIRECT_URI,
    GITEE_CLIENT_ID, GITEE_CLIENT_SECRET, GITEE_REDIRECT_URI,
)

logger = logging.getLogger(__name__)

# Shared timeout configuration for all OAuth provider HTTP requests
HTTP_TIMEOUT = httpx.Timeout(10.0)


def generate_pkce_pair() -> tuple[str, str]:
    """Generate PKCE code_verifier and code_challenge (S256).

    code_verifier: 128-char random string (RFC 7636 recommends 43-128 chars).
    code_challenge: BASE64URL(SHA256(code_verifier)) with padding stripped.
    """
    chars = string.ascii_letters + string.digits + "-._~"
    code_verifier = ''.join(_secrets.choice(chars) for _ in range(128))
    digest = hashlib.sha256(code_verifier.encode('ascii')).digest()
    code_challenge = base64.urlsafe_b64encode(digest).rstrip(b'=').decode('ascii')
    return code_verifier, code_challenge


class OAuthProvider(ABC):
    supports_pkce: bool = False

    @abstractmethod
    def get_authorize_url(self, state: str, code_challenge: str | None = None) -> str:
        pass

    @abstractmethod
    async def exchange_code_for_token(self, code: str, code_verifier: str | None = None) -> tuple[str | None, str | None]:
        """Exchange authorization code for access token.

        Returns: (access_token, error_description) — one will be None.
        """
        pass

    @abstractmethod
    async def get_user_info(self, access_token: str) -> dict | None:
        """Get user info from the OAuth provider.

        Returns: dict with oauth_id, username, avatar_url, email — or None on error.
        """
        pass


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

    async def exchange_code_for_token(self, code: str, code_verifier: str | None = None) -> tuple[str | None, str | None]:
        """Exchange code for token. Handles GitHub's known HTTP-200-with-error bug.

        See: https://github.com/orgs/community/discussions/57068
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

            # GitHub returns HTTP 200 with error in JSON body (known bug)
            if "error" in body:
                error_desc = body.get("error_description", body["error"])
                logger.warning(f"GitHub token exchange error: {error_desc}")
                return None, error_desc

            return body.get("access_token"), None

    async def get_user_info(self, access_token: str) -> dict | None:
        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
            resp = await client.get(
                "https://api.github.com/user",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/json",
                },
            )
            resp.raise_for_status()
            data = resp.json()
            if not data.get("id"):
                logger.warning("GitHub user info missing 'id' field")
                return None
            return {
                "oauth_id": str(data["id"]),
                "username": data.get("login", "unknown"),
                "avatar_url": data.get("avatar_url"),
                "email": data.get("email"),
            }


class GiteeProvider(OAuthProvider):
    supports_pkce = False

    def get_authorize_url(self, state: str, code_challenge: str | None = None) -> str:
        return (
            f"https://gitee.com/oauth/authorize"
            f"?client_id={GITEE_CLIENT_ID}"
            f"&redirect_uri={GITEE_REDIRECT_URI}"
            f"&scope=user_info"
            f"&state={state}"
            f"&response_type=code"
        )

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

            # Check for error in response body (standard OAuth2 error format)
            if "error" in body:
                error_desc = body.get("error_description", body["error"])
                logger.warning(f"Gitee token exchange error: {error_desc}")
                return None, error_desc

            resp.raise_for_status()
            return body.get("access_token"), None

    async def get_user_info(self, access_token: str) -> dict | None:
        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
            resp = await client.get(
                "https://gitee.com/api/v5/user",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            resp.raise_for_status()
            data = resp.json()
            if not data.get("id"):
                logger.warning("Gitee user info missing 'id' field")
                return None
            return {
                "oauth_id": str(data["id"]),
                "username": data.get("login", "unknown"),
                "avatar_url": data.get("avatar_url"),
                "email": data.get("email"),
            }


def get_provider(provider_name: str) -> OAuthProvider:
    providers = {
        "github": GitHubProvider,
        "gitee": GiteeProvider,
    }
    provider_class = providers.get(provider_name)
    if not provider_class:
        raise ValueError(f"Unsupported OAuth provider: {provider_name}")
    return provider_class()
