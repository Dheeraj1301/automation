"""Symmetric encryption for secrets stored at rest (OAuth tokens, etc).

Uses Fernet (AES-128-CBC + HMAC) since these are small, individually
encrypted string values, not bulk data. TOKEN_ENCRYPTION_KEY must be a
32-byte urlsafe-base64 key (Fernet.generate_key()).
"""

import base64
import hashlib

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import settings


def _derive_key(secret: str) -> bytes:
    """Deterministically derives a valid Fernet key from an arbitrary secret.

    Used only as the local-dev fallback when TOKEN_ENCRYPTION_KEY isn't set,
    so encryption works out of the box without extra setup. Production must
    set TOKEN_ENCRYPTION_KEY explicitly (see .env.production.example).
    """
    digest = hashlib.sha256(secret.encode()).digest()
    return base64.urlsafe_b64encode(digest)


def _fernet() -> Fernet:
    key = settings.TOKEN_ENCRYPTION_KEY or _derive_key(settings.JWT_SECRET).decode()
    return Fernet(key.encode())


def encrypt(value: str) -> str:
    return _fernet().encrypt(value.encode()).decode()


def decrypt(token: str) -> str | None:
    try:
        return _fernet().decrypt(token.encode()).decode()
    except InvalidToken:
        return None
