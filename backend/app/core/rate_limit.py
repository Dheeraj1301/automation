"""Fixed-window rate limiting for unauthenticated public endpoints, backed
by the Redis instance the stack already runs (previously unused for
anything load-bearing).

Fails open: if Redis is unreachable, requests are allowed through rather
than 500ing the storefront over a rate limiter outage.
"""

from fastapi import HTTPException, status

from app.core.config import settings
from app.core.redis import redis_client

WINDOW_SECONDS = 60


def enforce_rate_limit(key: str, limit: int | None = None) -> None:
    limit = limit or settings.RATE_LIMIT_PUBLIC_LEADS_PER_MINUTE
    redis_key = f"rate_limit:{key}"

    try:
        count = redis_client.incr(redis_key)
        if count == 1:
            redis_client.expire(redis_key, WINDOW_SECONDS)
    except Exception:
        return

    if count > limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests. Please try again shortly.",
        )
