"""Unauthenticated AI Sales Agent chat for the public storefront widget -
the customer-facing counterpart to the merchant test chat in ai_agent.py.
Same chat-turn logic (app/services/ai_chat.py), no auth boundary since
real customers, not merchants, are the caller.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.routes.public import get_org_by_slug_or_404
from app.db.session import get_db
from app.models.ai_conversation import AIConversation
from app.schemas.ai_agent import ChatRequest, ChatResponse
from app.services.ai_chat import AIChatError, run_chat_turn

router = APIRouter()

DEFAULT_CUSTOMER_IDENTIFIER = "storefront-visitor"


@router.post("/{org_slug}/ai/chat", response_model=ChatResponse)
def public_chat(org_slug: str, payload: ChatRequest, db: Session = Depends(get_db)) -> ChatResponse:
    organization = get_org_by_slug_or_404(db, org_slug)

    if payload.conversation_id:
        conversation = (
            db.query(AIConversation)
            .filter(AIConversation.id == payload.conversation_id, AIConversation.organization_id == organization.id)
            .first()
        )
        if conversation is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    else:
        conversation = AIConversation(
            organization_id=organization.id,
            customer_identifier=payload.customer_identifier or DEFAULT_CUSTOMER_IDENTIFIER,
        )
        db.add(conversation)
        db.flush()

    try:
        reply_text = run_chat_turn(db, organization, conversation, payload.message)
    except AIChatError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail)

    return ChatResponse(conversation_id=conversation.id, message=reply_text)
