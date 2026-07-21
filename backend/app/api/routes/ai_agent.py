import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_membership, require_role
from app.db.session import get_db
from app.models.ai_conversation import AIConversation
from app.models.ai_message import AIMessage
from app.models.membership import Membership
from app.models.organization import Organization
from app.schemas.ai_agent import (
    ChatRequest,
    ChatResponse,
    ConversationDetail,
    ConversationMessageResponse,
    ConversationSummary,
)
from app.services.ai_chat import handle_chat_message

router = APIRouter()

CATALOG_ROLES = ("owner", "admin", "staff")
DEFAULT_CUSTOMER_IDENTIFIER = "merchant-test-console"


@router.post("/chat", response_model=ChatResponse)
def chat(
    org_id: uuid.UUID,
    payload: ChatRequest,
    membership: Membership = Depends(require_role(*CATALOG_ROLES)),
    db: Session = Depends(get_db),
) -> ChatResponse:
    organization = db.get(Organization, org_id)
    return handle_chat_message(
        db,
        organization,
        payload.conversation_id,
        payload.message,
        payload.customer_identifier or DEFAULT_CUSTOMER_IDENTIFIER,
    )


@router.get("/conversations", response_model=list[ConversationSummary])
def list_conversations(
    org_id: uuid.UUID,
    membership: Membership = Depends(get_membership),
    db: Session = Depends(get_db),
) -> list[ConversationSummary]:
    conversations = (
        db.query(AIConversation)
        .filter(AIConversation.organization_id == org_id)
        .order_by(AIConversation.updated_at.desc())
        .limit(100)
        .all()
    )

    summaries = []
    for conversation in conversations:
        last_message = (
            db.query(AIMessage)
            .filter(AIMessage.conversation_id == conversation.id)
            .order_by(AIMessage.created_at.desc())
            .first()
        )
        message_count = db.query(AIMessage).filter(AIMessage.conversation_id == conversation.id).count()
        summaries.append(
            ConversationSummary(
                id=conversation.id,
                customer_identifier=conversation.customer_identifier,
                created_at=conversation.created_at,
                updated_at=conversation.updated_at,
                message_count=message_count,
                last_message_preview=(last_message.content[:120] if last_message else None),
            )
        )
    return summaries


@router.get("/conversations/{conversation_id}", response_model=ConversationDetail)
def get_conversation(
    org_id: uuid.UUID,
    conversation_id: uuid.UUID,
    membership: Membership = Depends(get_membership),
    db: Session = Depends(get_db),
) -> ConversationDetail:
    conversation = (
        db.query(AIConversation)
        .filter(AIConversation.id == conversation_id, AIConversation.organization_id == org_id)
        .first()
    )
    if conversation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    return ConversationDetail(
        id=conversation.id,
        customer_identifier=conversation.customer_identifier,
        messages=[ConversationMessageResponse.model_validate(m) for m in conversation.messages],
    )
