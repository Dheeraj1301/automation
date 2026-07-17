from decimal import Decimal

from app.core.ai_sales_agent import ProductContext, build_system_prompt, extract_keywords, format_catalog_context
from app.schemas.ai_config import AIConfigData, FaqItem


def test_extract_keywords_filters_stopwords_and_short_words():
    keywords = extract_keywords("Hi, do you have any blue running shoes in size 10?")
    assert "blue" in keywords
    assert "running" in keywords
    assert "shoes" in keywords
    assert "size" in keywords
    assert "hi" not in keywords
    assert "you" not in keywords
    assert "do" not in keywords


def test_extract_keywords_deduplicates_and_caps_length():
    keywords = extract_keywords("shirt shirt shirt blue blue red green yellow purple orange", max_keywords=3)
    assert keywords == ["shirt", "blue", "red"]


def test_extract_keywords_empty_message():
    assert extract_keywords("") == []
    assert extract_keywords("hi hello hey thanks") == []


def test_format_catalog_context_empty():
    assert "No matching products" in format_catalog_context([])


def test_format_catalog_context_formats_price_range_and_stock():
    products = [
        ProductContext(
            name="Classic Tee",
            description="A comfy cotton tee",
            category_name="Apparel",
            min_price=Decimal("19.99"),
            max_price=Decimal("24.99"),
            total_inventory=5,
        ),
        ProductContext(
            name="Sold Out Mug",
            description=None,
            category_name=None,
            min_price=Decimal("9.99"),
            max_price=Decimal("9.99"),
            total_inventory=0,
        ),
    ]
    text = format_catalog_context(products)
    assert "Classic Tee" in text
    assert "$19.99-$24.99" in text
    assert "in stock" in text
    assert "Sold Out Mug" in text
    assert "$9.99" in text
    assert "out of stock" in text


def test_build_system_prompt_includes_guardrail_and_catalog_context():
    config = AIConfigData(
        business_description="We sell handmade candles.",
        brand_tone="Warm and friendly",
        faqs=[FaqItem(question="Do you ship internationally?", answer="Yes.")],
        shipping_policy="2-3 business days.",
        return_policy="30-day returns.",
    )
    products = [
        ProductContext(
            name="Lavender Candle",
            description="Relaxing scent",
            category_name="Candles",
            min_price=Decimal("15.00"),
            max_price=Decimal("15.00"),
            total_inventory=10,
        )
    ]

    prompt = build_system_prompt("Candle Co", config, products)

    assert "Candle Co" in prompt
    assert "handmade candles" in prompt
    assert "Warm and friendly" in prompt
    assert "Lavender Candle" in prompt
    assert "Do you ship internationally?" in prompt
    assert "Never invent a product name, SKU, or price" in prompt


def test_build_system_prompt_handles_empty_ai_config_gracefully():
    prompt = build_system_prompt("My Store", AIConfigData(), [])
    assert "My Store" in prompt
    assert "Not provided." in prompt
    assert "No matching products" in prompt


def test_build_system_prompt_omits_handoff_rule_when_no_whatsapp_number():
    prompt = build_system_prompt("My Store", AIConfigData(), [])
    assert "WhatsApp" not in prompt


def test_build_system_prompt_includes_handoff_rule_when_whatsapp_number_given():
    prompt = build_system_prompt("My Store", AIConfigData(), [], whatsapp_number="+15551234567")
    assert "+15551234567" in prompt
    assert "WhatsApp" in prompt
    assert "ready to close the sale" in prompt
