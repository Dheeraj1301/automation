"""Redis-backed rate limiter for public endpoints. Uses a fake Redis client
so these run without a real Redis instance."""

import pytest
from fastapi import HTTPException

from app.core import rate_limit


class FakeRedis:
    def __init__(self):
        self.counts: dict[str, int] = {}

    def incr(self, key: str) -> int:
        self.counts[key] = self.counts.get(key, 0) + 1
        return self.counts[key]

    def expire(self, key: str, seconds: int) -> None:
        pass


class BrokenRedis:
    def incr(self, key: str) -> int:
        raise ConnectionError("redis is down")


def test_allows_requests_under_the_limit(monkeypatch):
    monkeypatch.setattr(rate_limit, "redis_client", FakeRedis())
    for _ in range(5):
        rate_limit.enforce_rate_limit("test-key", limit=10)


def test_blocks_requests_over_the_limit(monkeypatch):
    monkeypatch.setattr(rate_limit, "redis_client", FakeRedis())
    for _ in range(3):
        rate_limit.enforce_rate_limit("test-key", limit=3)

    with pytest.raises(HTTPException) as exc_info:
        rate_limit.enforce_rate_limit("test-key", limit=3)
    assert exc_info.value.status_code == 429


def test_fails_open_when_redis_is_unreachable(monkeypatch):
    monkeypatch.setattr(rate_limit, "redis_client", BrokenRedis())
    # Should not raise, even though Redis is down.
    rate_limit.enforce_rate_limit("test-key", limit=1)
