import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    conversation_id: uuid.UUID | None = None
    message: str = Field(min_length=1, max_length=4000)
    customer_identifier: str | None = Field(default=None, max_length=255)


class ChatResponse(BaseModel):
    conversation_id: uuid.UUID
    message: str


class ConversationMessageResponse(BaseModel):
    role: str
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ConversationSummary(BaseModel):
    id: uuid.UUID
    customer_identifier: str
    created_at: datetime
    updated_at: datetime
    message_count: int
    last_message_preview: str | None


class ConversationDetail(BaseModel):
    id: uuid.UUID
    customer_identifier: str
    messages: list[ConversationMessageResponse]
