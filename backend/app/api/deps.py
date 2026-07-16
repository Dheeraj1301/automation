import uuid
from collections.abc import Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.membership import Membership
from app.models.organization import Organization
from app.models.role import Role
from app.models.user import User
from app.services.billing import SubscriptionStatus, billing_provider

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def get_current_user(
    token: str | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if token is None:
        raise credentials_exception

    subject = decode_access_token(token)
    if subject is None:
        raise credentials_exception

    try:
        user_id = uuid.UUID(subject)
    except ValueError:
        raise credentials_exception

    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise credentials_exception

    return user


def get_membership(
    org_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Membership:
    membership = (
        db.query(Membership)
        .filter(Membership.organization_id == org_id, Membership.user_id == current_user.id)
        .first()
    )
    if membership is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    return membership


def get_membership_role_name(membership: Membership, db: Session) -> str:
    role = db.get(Role, membership.role_id)
    return role.name if role else ""


def require_role(*allowed_roles: str) -> Callable[..., Membership]:
    def dependency(
        membership: Membership = Depends(get_membership),
        db: Session = Depends(get_db),
    ) -> Membership:
        if get_membership_role_name(membership, db) not in allowed_roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return membership

    return dependency


def require_active_plan(*allowed_plans: str) -> Callable[..., Organization]:
    """Gates a route to organizations whose billing plan is one of allowed_plans.

    Leave allowed_plans empty to just require an active subscription of any plan.
    """

    def dependency(
        membership: Membership = Depends(get_membership),
        db: Session = Depends(get_db),
    ) -> Organization:
        organization = db.get(Organization, membership.organization_id)
        subscription: SubscriptionStatus = billing_provider.get_subscription(organization)
        if not subscription.is_active:
            raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail="Subscription is not active")
        if allowed_plans and subscription.plan not in allowed_plans:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=f"This feature requires one of these plans: {', '.join(allowed_plans)}",
            )
        return organization

    return dependency
