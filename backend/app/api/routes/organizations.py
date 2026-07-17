import secrets
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_membership, get_membership_role_name, require_active_plan, require_role
from app.core.logging import get_logger
from app.core.provisioning import create_organization_with_owner, get_or_create_role
from app.db.session import get_db
from app.models.invitation import PENDING, REVOKED, Invitation
from app.models.membership import Membership
from app.models.organization import Organization
from app.models.role import Role
from app.models.user import User
from app.schemas.organization import (
    AcceptInviteRequest,
    InviteCreateRequest,
    InvitationPreviewResponse,
    InvitationResponse,
    MemberResponse,
    MemberRoleUpdate,
    MyOrganizationResponse,
    OrganizationCreate,
    OrganizationResponse,
    OrganizationUpdate,
)
from app.services.billing import billing_provider

router = APIRouter()
logger = get_logger(__name__)

UPLOAD_ROOT = Path("uploads")
ALLOWED_LOGO_TYPES = {"image/png": "png", "image/jpeg": "jpg", "image/webp": "webp"}
MAX_LOGO_BYTES = 2 * 1024 * 1024
INVITE_TTL_DAYS = 7


@router.get("", response_model=list[MyOrganizationResponse])
def list_my_organizations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[MyOrganizationResponse]:
    rows = (
        db.query(Organization, Role.name)
        .join(Membership, Membership.organization_id == Organization.id)
        .join(Role, Role.id == Membership.role_id)
        .filter(Membership.user_id == current_user.id)
        .all()
    )
    return [
        MyOrganizationResponse(
            id=org.id, name=org.name, slug=org.slug, plan=org.plan, logo_path=org.logo_path, role=role_name
        )
        for org, role_name in rows
    ]


@router.post("", response_model=OrganizationResponse, status_code=status.HTTP_201_CREATED)
def create_organization(
    payload: OrganizationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Organization:
    organization = create_organization_with_owner(db, current_user, payload.name)
    db.commit()
    logger.info("organization_created", organization_id=str(organization.id), user_id=str(current_user.id))
    return organization


@router.get("/{org_id}", response_model=OrganizationResponse)
def get_organization(
    org_id: uuid.UUID,
    membership: Membership = Depends(get_membership),
    db: Session = Depends(get_db),
) -> Organization:
    return db.get(Organization, org_id)


@router.patch("/{org_id}", response_model=OrganizationResponse)
def update_organization(
    org_id: uuid.UUID,
    payload: OrganizationUpdate,
    membership: Membership = Depends(require_role("owner", "admin")),
    db: Session = Depends(get_db),
) -> Organization:
    organization = db.get(Organization, org_id)
    for field_name, value in payload.model_dump(exclude_unset=True).items():
        setattr(organization, field_name, value)
    db.commit()
    db.refresh(organization)
    return organization


@router.post("/{org_id}/logo", response_model=OrganizationResponse)
async def upload_logo(
    org_id: uuid.UUID,
    file: UploadFile = File(...),
    membership: Membership = Depends(require_role("owner", "admin")),
    db: Session = Depends(get_db),
) -> Organization:
    extension = ALLOWED_LOGO_TYPES.get(file.content_type)
    if extension is None:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Logo must be a PNG, JPEG, or WEBP image",
        )

    contents = await file.read()
    if len(contents) > MAX_LOGO_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Logo must be under 2MB")

    org_dir = UPLOAD_ROOT / str(org_id)
    org_dir.mkdir(parents=True, exist_ok=True)
    logo_file = org_dir / f"logo.{extension}"
    logo_file.write_bytes(contents)

    organization = db.get(Organization, org_id)
    organization.logo_path = f"/uploads/{org_id}/logo.{extension}"
    db.commit()
    db.refresh(organization)
    return organization


@router.get("/{org_id}/members", response_model=list[MemberResponse])
def list_members(
    org_id: uuid.UUID,
    membership: Membership = Depends(get_membership),
    db: Session = Depends(get_db),
) -> list[MemberResponse]:
    rows = (
        db.query(User, Role.name)
        .join(Membership, Membership.user_id == User.id)
        .join(Role, Role.id == Membership.role_id)
        .filter(Membership.organization_id == org_id)
        .all()
    )
    return [MemberResponse(user_id=user.id, email=user.email, full_name=user.full_name, role=role_name) for user, role_name in rows]


@router.patch("/{org_id}/members/{user_id}", response_model=MemberResponse)
def update_member_role(
    org_id: uuid.UUID,
    user_id: uuid.UUID,
    payload: MemberRoleUpdate,
    membership: Membership = Depends(require_role("owner")),
    db: Session = Depends(get_db),
) -> MemberResponse:
    if user_id == membership.user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot change your own role")

    target = db.query(Membership).filter(Membership.organization_id == org_id, Membership.user_id == user_id).first()
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

    role = get_or_create_role(db, payload.role)
    target.role_id = role.id
    db.commit()

    user = db.get(User, user_id)
    return MemberResponse(user_id=user.id, email=user.email, full_name=user.full_name, role=role.name)


@router.delete("/{org_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member(
    org_id: uuid.UUID,
    user_id: uuid.UUID,
    membership: Membership = Depends(require_role("owner", "admin")),
    db: Session = Depends(get_db),
) -> None:
    if user_id == membership.user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot remove yourself")

    target = db.query(Membership).filter(Membership.organization_id == org_id, Membership.user_id == user_id).first()
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

    if get_membership_role_name(target, db) == "owner" and get_membership_role_name(membership, db) != "owner":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only an owner can remove another owner")

    db.delete(target)
    db.commit()


@router.get("/{org_id}/invites", response_model=list[InvitationResponse])
def list_invites(
    org_id: uuid.UUID,
    membership: Membership = Depends(require_role("owner", "admin")),
    db: Session = Depends(get_db),
) -> list[InvitationResponse]:
    rows = (
        db.query(Invitation, Role.name)
        .join(Role, Role.id == Invitation.role_id)
        .filter(Invitation.organization_id == org_id, Invitation.status == PENDING)
        .all()
    )
    return [
        InvitationResponse(id=inv.id, email=inv.email, role=role_name, status=inv.status, expires_at=inv.expires_at)
        for inv, role_name in rows
    ]


@router.post("/{org_id}/invites", response_model=InvitationResponse, status_code=status.HTTP_201_CREATED)
def create_invite(
    org_id: uuid.UUID,
    payload: InviteCreateRequest,
    membership: Membership = Depends(require_role("owner", "admin")),
    db: Session = Depends(get_db),
) -> InvitationResponse:
    organization = db.get(Organization, org_id)
    subscription = billing_provider.get_subscription(organization)

    if subscription.seat_limit is not None:
        member_count = db.query(Membership).filter(Membership.organization_id == org_id).count()
        pending_invite_count = (
            db.query(Invitation)
            .filter(Invitation.organization_id == org_id, Invitation.status == PENDING)
            .count()
        )
        if member_count + pending_invite_count >= subscription.seat_limit:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=f"The {subscription.plan} plan is limited to {subscription.seat_limit} seat(s). Upgrade to invite more teammates.",
            )

    role = get_or_create_role(db, payload.role)
    invitation = Invitation(
        organization_id=org_id,
        email=payload.email,
        role_id=role.id,
        invited_by_user_id=membership.user_id,
        token=secrets.token_urlsafe(32),
        status=PENDING,
        expires_at=datetime.now(timezone.utc) + timedelta(days=INVITE_TTL_DAYS),
    )
    db.add(invitation)
    db.commit()
    db.refresh(invitation)

    logger.info(
        "invite_would_be_sent",
        organization_id=str(org_id),
        email=payload.email,
        invite_token=invitation.token,
    )

    return InvitationResponse(
        id=invitation.id, email=invitation.email, role=role.name, status=invitation.status, expires_at=invitation.expires_at
    )


@router.delete("/{org_id}/invites/{invite_id}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_invite(
    org_id: uuid.UUID,
    invite_id: uuid.UUID,
    membership: Membership = Depends(require_role("owner", "admin")),
    db: Session = Depends(get_db),
) -> None:
    invitation = db.query(Invitation).filter(Invitation.id == invite_id, Invitation.organization_id == org_id).first()
    if invitation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invite not found")

    invitation.status = REVOKED
    db.commit()


@router.get("/{org_id}/pro-feature-demo")
def pro_feature_demo(organization: Organization = Depends(require_active_plan("pro", "enterprise"))) -> dict:
    """Example route gated by subscription plan, per the Phase 2 requirement."""
    return {"message": f"Welcome to the Pro feature area, organization={organization.name}, plan={organization.plan}"}
