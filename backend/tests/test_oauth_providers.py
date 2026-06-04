import pytest
from oauth_providers import get_provider, GitHubProvider, GiteeProvider, generate_pkce_pair


def test_get_github_provider():
    provider = get_provider('github')
    assert isinstance(provider, GitHubProvider)


def test_get_gitee_provider():
    provider = get_provider('gitee')
    assert isinstance(provider, GiteeProvider)


def test_get_unsupported_provider():
    with pytest.raises(ValueError):
        get_provider('unsupported')


def test_github_authorize_url():
    provider = GitHubProvider()
    url = provider.get_authorize_url('test_state')
    assert 'github.com/login/oauth/authorize' in url
    assert 'test_state' in url
    assert 'code_challenge' not in url


def test_gitee_authorize_url():
    provider = GiteeProvider()
    url = provider.get_authorize_url('test_state')
    assert 'gitee.com/oauth/authorize' in url
    assert 'test_state' in url


# ── PKCE tests ──────────────────────────────────────────────────────────


def test_github_supports_pkce():
    provider = GitHubProvider()
    assert provider.supports_pkce is True


def test_gitee_does_not_support_pkce():
    provider = GiteeProvider()
    assert provider.supports_pkce is False


def test_generate_pkce_pair():
    verifier, challenge = generate_pkce_pair()
    assert len(verifier) == 128
    assert len(challenge) == 43  # base64url(SHA256) = 43 chars without padding
    assert '=' not in challenge  # no padding
    assert '+' not in challenge  # base64url, not base64
    assert '/' not in challenge  # base64url, not base64


def test_github_authorize_url_with_pkce():
    provider = GitHubProvider()
    url = provider.get_authorize_url('test_state', code_challenge='abc123')
    assert 'code_challenge=abc123' in url
    assert 'code_challenge_method=S256' in url


def test_gitee_authorize_url_ignores_pkce():
    """Gitee doesn't support PKCE, code_challenge should be ignored."""
    provider = GiteeProvider()
    url = provider.get_authorize_url('test_state', code_challenge='abc123')
    assert 'code_challenge' not in url
