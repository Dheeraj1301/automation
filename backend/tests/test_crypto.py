from app.core.config import settings
from app.core.crypto import decrypt, encrypt


def test_encrypt_decrypt_round_trip():
    ciphertext = encrypt("super-secret-refresh-token")
    assert ciphertext != "super-secret-refresh-token"
    assert decrypt(ciphertext) == "super-secret-refresh-token"


def test_decrypt_returns_none_for_garbage_input():
    assert decrypt("not-a-valid-token") is None


def test_ciphertext_changes_when_encryption_key_changes(monkeypatch):
    ciphertext = encrypt("a-token")
    monkeypatch.setattr(settings, "TOKEN_ENCRYPTION_KEY", "")
    monkeypatch.setattr(settings, "JWT_SECRET", "a-completely-different-secret")
    assert decrypt(ciphertext) is None
