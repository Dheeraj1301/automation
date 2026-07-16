from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.logging import get_logger
from app.db.session import get_db
from app.models.invitation import ACCEPTED, PENDING, Invitation
from app.models.membership import Membership
from app.models.organization import Organization
from app.models.role import Role
from app.models.user import User
from app.schemas.organization import AcceptInviteRequest, InvitationPreviewResponse, MyOrganizationResponse

router = APIRouter()
logger = get_logger(__name__)


def _get_valid_invite(db: Session, token: str) -> Invitation:
    invitation = db.query(Invitation).filter(Invitation.token == token).first()
    if invitation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invite not found")
    return invitation


def _is_invite_valid(invitation: Invitation) -> bool:
    return invitation.status == PENDING and invitation.expires_at > datetime.now(timezone.utc)


@router.get("/{token}", response_model=InvitationPreviewResponse)
def preview_invite(token: str, db: Session = Depends(get_db)) -> InvitationPreviewResponse:
    invitation = _get_valid_invite(db, token)
    organization = db.get(Organization, invitation.organization_id)
    role = db.get(Role, invitation.role_id)
    return InvitationPreviewResponse(
        organization_name=organization.name,
        email=invitation.email,
        role=role.name,
        is_valid=_is_invite_valid(invitation),
    )


@router.post("/accept", response_model=MyOrganizationResponse)
def accept_invite(
    payload: AcceptInviteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MyOrganizationResponse:
    invitation = _get_valid_invite(db, payload.token)

    if not _is_invite_valid(invitation):
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="This invite is no longer valid")

    if invitation.email.lower() != current_user.email.lower():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This invite was sent to a different email address",
        )

    existing = (
        db.query(Membership)
        .filter(Membership.organization_id == invitation.organization_id, Membership.user_id == current_user.id)
        .first()
    )
    if existing is None:
        db.add(
            Membership(
                user_id=current_user.id,
                organization_id=invitation.organization_id,
                role_id=invitation.role_id,
            )
        )

    invitation.status = ACCEPTED
    db.commit()

    logger.info("invite_accepted", organization_id=str(invitation.organization_id), user_id=str(current_user.id))

    organization = db.get(Organization, invitation.organization_id)
    role = db.get(Role, invitation.role_id)
    return MyOrganizationResponse(
        id=organization.id,
        name=organization.name,
        slug=organization.slug,
        plan=organization.plan,
        logo_path=organization.logo_path,
        role=role.name,
    )
