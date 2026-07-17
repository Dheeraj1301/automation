"""Pure logic for the AI Sales Agent: keyword extraction (RAG-lite retrieval
key) and system prompt construction. Kept free of DB/Anthropic SDK calls so
it's directly unit-testable.
"""

import re
from dataclasses import dataclass
from decimal import Decimal

from app.schemas.ai_config import AIConfigData

STOPWORDS = {
    "the", "a", "an", "is", "are", "do", "does", "i", "you", "we", "for", "of", "to",
    "and", "in", "on", "with", "have", "has", "want", "wants", "need", "needs",
    "looking", "please", "can", "could", "would", "like", "about", "my", "your",
    "it", "this", "that", "me", "im", "hi", "hello", "hey", "thanks", "thank",
}

MAX_KEYWORDS = 5
MAX_CATALOG_PRODUCTS = 5


def extract_keywords(message: str, max_keywords: int = MAX_KEYWORDS) -> list[str]:
    """Extracts significant words from a customer message for keyword-based
    catalog retrieval (RAG-lite)."""
    words = re.findall(r"[a-zA-Z0-9]+", message.lower())
    keywords: list[str] = []
    seen: set[str] = set()
    for word in words:
        if len(word) <= 2 or word in STOPWORDS or word in seen:
            continue
        seen.add(word)
        keywords.append(word)
        if len(keywords) >= max_keywords:
            break
    return keywords


@dataclass
class ProductContext:
    name: str
    description: str | None
    category_name: str | None
    min_price: Decimal
    max_price: Decimal
    total_inventory: int


def format_catalog_context(products: list[ProductContext]) -> str:
    if not products:
        return "No matching products were found in the catalog for this query."

    lines = []
    for p in products:
        price = f"${p.min_price}" if p.min_price == p.max_price else f"${p.min_price}-${p.max_price}"
        stock = "in stock" if p.total_inventory > 0 else "out of stock"
        category = f" [{p.category_name}]" if p.category_name else ""
        description = f" - {p.description}" if p.description else ""
        lines.append(f"- {p.name}{category}: {price}, {stock}{description}")
    return "\n".join(lines)


def build_system_prompt(
    organization_name: str,
    ai_config: AIConfigData,
    products: list[ProductContext],
    whatsapp_number: str | None = None,
) -> str:
    faqs_text = (
        "\n".join(f"Q: {faq.question}\nA: {faq.answer}" for faq in ai_config.faqs)
        if ai_config.faqs
        else "None provided."
    )

    handoff_rule = (
        f"5. If the customer asks about final pricing, availability/lead time, wants to negotiate, "
        f"or is ready to close the sale, tell them to continue on WhatsApp at {whatsapp_number} to "
        f"finish with a team member - don't try to close the deal yourself."
        if whatsapp_number
        else ""
    )

    return f"""You are the AI sales assistant for {organization_name}.

BUSINESS DESCRIPTION:
{ai_config.business_description or "Not provided."}

BRAND TONE:
{ai_config.brand_tone or "Friendly and helpful."}

TARGET AUDIENCE:
{ai_config.target_audience or "Not provided."}

SHIPPING POLICY:
{ai_config.shipping_policy or "Not provided."}

RETURN POLICY:
{ai_config.return_policy or "Not provided."}

FREQUENTLY ASKED QUESTIONS:
{faqs_text}

CATALOG CONTEXT (products relevant to the customer's latest message):
{format_catalog_context(products)}

RULES (follow these strictly):
1. You may only mention products, prices, and stock levels that appear in the CATALOG CONTEXT above. Never invent a product name, SKU, or price.
2. If the customer asks about a product not listed in CATALOG CONTEXT, say you don't have that information and offer to help them browse the catalog instead.
3. Stay in the brand tone described above.
4. Keep responses concise and helpful, like a real sales assistant.
{handoff_rule}"""
