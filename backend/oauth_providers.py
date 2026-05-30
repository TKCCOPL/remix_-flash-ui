from abc import ABC, abstractmethod
from config import (
    GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GITHUB_REDIRECT_URI,
    GITEE_CLIENT_ID, GITEE_CLIENT_SECRET, GITEE_REDIRECT_URI,
)


class OAuthProvider(ABC):
    @abstractmethod
    def get_authorize_url(self, state: str) -> str:
        pass

    @abstractmethod
    async def exchange_code_for_token(self, code: str) -> str:
        pass

    @abstractmethod
    async def get_user_info(self, access_token: str) -> dict:
        pass


class GitHubProvider(OAuthProvider):
    def get_authorize_url(self, state: str) -> str:
        return (
            f"https://github.com/login/oauth/authorize"
            f"?client_id={GITHUB_CLIENT_ID}"
            f"&redirect_uri={GITHUB_REDIRECT_URI}"
            f"&scope=read:user user:email"
            f"&state={state}"
        )

    async def exchange_code_for_token(self, code: str) -> str:
        import httpx
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://github.com/login/oauth/access_token",
                json={
                    "client_id": GITHUB_CLIENT_ID,
                    "client_secret": GITHUB_CLIENT_SECRET,
                    "code": code,
                },
                headers={"Accept": "application/json"},
            )
            data = resp.json()
            return data.get("access_token")

    async def get_user_info(self, access_token: str) -> dict:
        import httpx
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://api.github.com/user",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/json",
                },
            )
            data = resp.json()
            return {
                "oauth_id": str(data["id"]),
                "username": data["login"],
                "avatar_url": data.get("avatar_url"),
                "email": data.get("email"),
            }


class GiteeProvider(OAuthProvider):
    def get_authorize_url(self, state: str) -> str:
        return (
            f"https://gitee.com/oauth/authorize"
            f"?client_id={GITEE_CLIENT_ID}"
            f"&redirect_uri={GITEE_REDIRECT_URI}"
            f"&scope=user_info"
            f"&state={state}"
            f"&response_type=code"
        )

    async def exchange_code_for_token(self, code: str) -> str:
        import httpx
        async with httpx.AsyncClient() as client:
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
            data = resp.json()
            return data.get("access_token")

    async def get_user_info(self, access_token: str) -> dict:
        import httpx
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://gitee.com/api/v5/user",
                params={"access_token": access_token},
            )
            data = resp.json()
            return {
                "oauth_id": str(data["id"]),
                "username": data["login"],
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
