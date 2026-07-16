from fastapi import APIRouter
from sqlalchemy import text

from app.core.redis import redis_client
from app.db.session import SessionLocal

router = APIRouter()


@router.get("/health")
def health_check() -> dict:
    db_ok = True
    redis_ok = True

    try:
        with SessionLocal() as db:
            db.execute(text("SELECT 1"))
    except Exception:
        db_ok = False

    try:
        redis_client.ping()
    except Exception:
        redis_ok = False

    status = "ok" if db_ok and redis_ok else "degraded"
    return {"status": status, "database": db_ok, "redis": redis_ok}
