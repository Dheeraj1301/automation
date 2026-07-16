import re
import uuid

from sqlalchemy.orm import Session

from app.models.membership import Membership
from app.models.organization import Organization
from app.models.role import Role
from app.models.user import User

OWNER_ROLE = "owner"


def slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return slug or uuid.uuid4().hex[:8]


def unique_slug(db: Session, name: str) -> str:
    base_slug = slugify(name)
    slug = base_slug
    suffix = 1
    while db.query(Organization).filter(Organization.slug == slug).first() is not None:
        suffix += 1
        slug = f"{base_slug}-{suffix}"
    return slug


def get_or_create_role(db: Session, name: str) -> Role:
    role = db.query(Role).filter(Role.name == name).first()
    if role is None:
        role = Role(name=name)
        db.add(role)
        db.flush()
    return role


def create_organization_with_owner(db: Session, user: User, name: str) -> Organization:
    organization = Organization(name=name, slug=unique_slug(db, name))
    db.add(organization)
    db.flush()

    owner_role = get_or_create_role(db, OWNER_ROLE)
    db.add(Membership(user_id=user.id, organization_id=organization.id, role_id=owner_role.id))
    db.flush()

    return organization
