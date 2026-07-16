import re
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.logging import get_logger
from app.core.security import create_access_token, hash_password, verify_password
from app.db.session import get_db
from app.models.membership import Membership
from app.models.organization import Organization
from app.models.role import Role
from app.models.user import User
from app.schemas.auth import LoginRequest, SignupRequest, TokenResponse, UserResponse

router = APIRouter()
logger = get_logger(__name__)

OWNER_ROLE = "owner"


def _slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return slug or uuid.uuid4().hex[:8]


def _get_or_create_owner_role(db: Session) -> Role:
    role = db.query(Role).filter(Role.name == OWNER_ROLE).first()
    if role is None:
        role = Role(name=OWNER_ROLE, description="Full access to the organization")
        db.add(role)
        db.flush()
    return role


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest, db: Session = Depends(get_db)) -> TokenResponse:
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
    )
    db.add(user)
    db.flush()

    base_slug = _slugify(payload.organization_name)
    slug = base_slug
    suffix = 1
    while db.query(Organization).filter(Organization.slug == slug).first() is not None:
        suffix += 1
        slug = f"{base_slug}-{suffix}"

    organization = Organization(name=payload.organization_name, slug=slug)
    db.add(organization)
    db.flush()

    owner_role = _get_or_create_owner_role(db)
    db.add(Membership(user_id=user.id, organization_id=organization.id, role_id=owner_role.id))

    db.commit()

    logger.info("user_signed_up", user_id=str(user.id), organization_id=str(organization.id))

    token = create_access_token(subject=str(user.id))
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.query(User).filter(User.email == payload.email).first()
    if user is None or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")

    logger.info("user_logged_in", user_id=str(user.id))

    token = create_access_token(subject=str(user.id))
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserResponse)
def read_current_user(current_user: User = Depends(get_current_user)) -> User:
    return current_user
