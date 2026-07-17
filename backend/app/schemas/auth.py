import uuid

from pydantic import BaseModel, EmailStr, Field


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str = Field(min_length=1, max_length=255)
    organization_name: str = Field(min_length=1, max_length=255)
    # E.164 format (e.g. +14155552671) - the number a customer's "Contact us
    # on WhatsApp" click and the AI Sales Agent's handoff both point to.
    whatsapp_number: str = Field(pattern=r"^\+[1-9]\d{7,14}$")


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: uuid.UUID
    email: EmailStr
    full_name: str
    is_active: bool

    model_config = {"from_attributes": True}
