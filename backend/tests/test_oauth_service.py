import pytest
from services.oauth_service import create_guest_token, verify_guest_token


def test_create_guest_token():
    token = create_guest_token(user_id=1, username="testuser")
    assert token is not None
    assert isinstance(token, str)


def test_verify_guest_token():
    token = create_guest_token(user_id=1, username="testuser")
    payload = verify_guest_token(token)
    assert payload is not None
    assert payload["user_id"] == 1
    assert payload["username"] == "testuser"


def test_verify_invalid_token():
    payload = verify_guest_token("invalid_token")
    assert payload is None
