import pytest
from oauth_providers import get_provider, GitHubProvider, GiteeProvider


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


def test_gitee_authorize_url():
    provider = GiteeProvider()
    url = provider.get_authorize_url('test_state')
    assert 'gitee.com/oauth/authorize' in url
    assert 'test_state' in url
