import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

INVITABLE_ROLES = ("admin", "staff")


class OrganizationCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class OrganizationUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class OrganizationResponse(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    plan: str
    logo_path: str | None

    model_config = {"from_attributes": True}


class MyOrganizationResponse(OrganizationResponse):
    role: str


class MemberResponse(BaseModel):
    user_id: uuid.UUID
    email: EmailStr
    full_name: str
    role: str


class MemberRoleUpdate(BaseModel):
    role: str = Field(pattern="^(owner|admin|staff)$")


class InviteCreateRequest(BaseModel):
    email: EmailStr
    role: str = Field(pattern="^(admin|staff)$")


class InvitationResponse(BaseModel):
    id: uuid.UUID
    email: EmailStr
    role: str
    status: str
    expires_at: datetime

    model_config = {"from_attributes": True}


class InvitationPreviewResponse(BaseModel):
    organization_name: str
    email: EmailStr
    role: str
    is_valid: bool


class AcceptInviteRequest(BaseModel):
    token: str
