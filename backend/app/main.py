from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.routes import (
    auth,
    categories,
    health,
    invitations,
    landing_pages,
    leads,
    organizations,
    products,
    public,
)
from app.core.config import settings
from app.core.logging import configure_logging, get_logger

configure_logging()
logger = get_logger(__name__)

UPLOAD_ROOT = Path("uploads")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
    logger.info("app_startup", env=settings.ENV)
    yield


app = FastAPI(title="ProfitPilot API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(organizations.router, prefix="/api/organizations", tags=["organizations"])
app.include_router(invitations.router, prefix="/api/invites", tags=["invitations"])
app.include_router(
    categories.router, prefix="/api/organizations/{org_id}/categories", tags=["categories"]
)
app.include_router(products.router, prefix="/api/organizations/{org_id}/products", tags=["products"])
app.include_router(
    landing_pages.router, prefix="/api/organizations/{org_id}/landing-pages", tags=["landing-pages"]
)
app.include_router(leads.router, prefix="/api/organizations/{org_id}/leads", tags=["leads"])
app.include_router(public.router, prefix="/api/public", tags=["public"])

UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_ROOT), name="uploads")
