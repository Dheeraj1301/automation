"""Shared AI Sales Agent chat-turn logic, used by both the authenticated
merchant test console (app/api/routes/ai_agent.py) and the public
customer-facing chat widget (app/api/routes/public.py). Keeping this in one
place means the two surfaces can never drift in behavior.
"""

import uuid

from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.ai_sales_agent import ProductContext, build_system_prompt, extract_keywords
from app.core.catalog import total_inventory, variant_price_range
from app.core.logging import get_logger
from app.models.ai_conversation import AIConversation
from app.models.ai_message import ROLE_ASSISTANT, ROLE_USER, AIMessage
from app.models.organization import Organization
from app.models.product import ACTIVE, Product
from app.models.setting import Setting
from app.schemas.ai_agent import ChatResponse
from app.schemas.ai_config import AIConfigData
from app.services.ai_provider import AIProviderNotConfiguredError, ai_provider

logger = get_logger(__name__)

AI_CONFIG_KEY = "ai_config"
CATALOG_RESULT_LIMIT = 5


def _load_ai_config(db: Session, org_id: uuid.UUID) -> AIConfigData:
    setting = db.query(Setting).filter(Setting.organization_id == org_id, Setting.key == AI_CONFIG_KEY).first()
    if setting is None:
        return AIConfigData()
    return AIConfigData.model_validate(setting.value)


def _find_relevant_products(db: Session, org_id: uuid.UUID, message: str) -> list[Product]:
    keywords = extract_keywords(message)
    query = db.query(Product).filter(Product.organization_id == org_id, Product.status == ACTIVE)

    if keywords:
        conditions = [Product.name.ilike(f"%{kw}%") for kw in keywords]
        matched = query.filter(or_(*conditions)).limit(CATALOG_RESULT_LIMIT).all()
        if matched:
            return matched

    return query.order_by(Product.created_at.desc()).limit(CATALOG_RESULT_LIMIT).all()


def _to_product_context(product: Product) -> ProductContext:
    min_price, max_price = variant_price_range(product.variants)
    return ProductContext(
        name=product.name,
        description=product.description,
        category_name=product.category.name if product.category else None,
        min_price=min_price,
        max_price=max_price,
        total_inventory=total_inventory(product.variants),
    )


def handle_chat_message(
    db: Session,
    organization: Organization,
    conversation_id: uuid.UUID | None,
    message: str,
    customer_identifier: str,
) -> ChatResponse:
    if conversation_id:
        conversation = (
            db.query(AIConversation)
            .filter(AIConversation.id == conversation_id, AIConversation.organization_id == organization.id)
            .first()
        )
        if conversation is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    else:
        conversation = AIConversation(organization_id=organization.id, customer_identifier=customer_identifier)
        db.add(conversation)
        db.flush()

    db.add(AIMessage(conversation_id=conversation.id, role=ROLE_USER, content=message))
    db.commit()

    ai_config = _load_ai_config(db, organization.id)
    products = [_to_product_context(p) for p in _find_relevant_products(db, organization.id, message)]
    handoff_number = organization.whatsapp_number if organization.whatsapp_verified else None
    system_prompt = build_system_prompt(organization.name, ai_config, products, handoff_number)

    history_rows = (
        db.query(AIMessage).filter(AIMessage.conversation_id == conversation.id).order_by(AIMessage.created_at).all()
    )
    history = [{"role": row.role, "content": row.content} for row in history_rows]

    try:
        reply_text = ai_provider.generate_reply(system_prompt, history)
    except AIProviderNotConfiguredError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))
    except Exception:
        logger.error("ai_sales_agent_reply_failed", organization_id=str(organization.id), conversation_id=str(conversation.id))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The AI Sales Agent could not generate a reply. Please try again.",
        )

    db.add(AIMessage(conversation_id=conversation.id, role=ROLE_ASSISTANT, content=reply_text))
    db.commit()

    return ChatResponse(conversation_id=conversation.id, message=reply_text)
