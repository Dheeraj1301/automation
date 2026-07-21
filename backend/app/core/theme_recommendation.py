"""Picks one of the 7 catalog themes for a merchant.

Keyword matching is the reliable default - fast, free, deterministic, and
works with no Anthropic key configured. `recommend_theme_with_ai` is an
optional upgrade for cases the keyword matcher can't confidently place,
using the same Anthropic integration as the AI Sales Agent.
"""

import re

from app.schemas.storefront_config import DEFAULT_THEME, THEME_IDS, ThemeId
from app.services.ai_provider import AIProviderNotConfiguredError, ai_provider

# Order matters only in that the first matching theme wins on a tie -
# keywords are intentionally non-overlapping so this rarely comes up.
THEME_KEYWORDS: dict[ThemeId, tuple[str, ...]] = {
    "luxury": ("jewellery", "jewelry", "watch", "watches", "luxury fashion", "perfume", "luxury"),
    "modern_tech": ("electronics", "electronic", "gadget", "saas", "software", " ai ", "tech", "app"),
    "premium_fashion": ("clothing", "clothes", "apparel", "shoe", "footwear", "accessories", "fashion"),
    "organic": ("food", "agriculture", "agri", "health", "organic", "wellness", "nutrition"),
    "industrial": ("manufactur", "machinery", "machine", "import export", "engineering", "industrial"),
    "interior": ("furniture", "home decor", "decor", "architecture", "interior"),
    "colorful_retail": ("toy", "gift", "lifestyle", "stationery", "stationary"),
}


def recommend_theme_by_keywords(industry: str, description: str = "") -> ThemeId:
    haystack = f" {industry.lower()} {description.lower()} "
    for theme_id, keywords in THEME_KEYWORDS.items():
        if any(kw in haystack for kw in keywords):
            return theme_id
    return DEFAULT_THEME


def recommend_theme_with_ai(industry: str, description: str, target_audience: str = "") -> ThemeId:
    """Falls back to keyword matching on any AI failure - a bad theme
    guess is cosmetic, never worth raising an error over."""
    fallback = recommend_theme_by_keywords(industry, description)

    prompt = f"""Pick exactly one catalog website theme for this business. Respond with ONLY a JSON object like {{"theme": "modern_tech"}} - no other text.

Available themes: {", ".join(THEME_IDS)}

- luxury: jewellery, watches, luxury fashion, perfumes (black/gold/white)
- modern_tech: electronics, AI, SaaS, gadgets (black/white/blue)
- premium_fashion: clothing, shoes, accessories (white/beige/black)
- organic: food, agriculture, health, organic products (green/cream/brown)
- industrial: manufacturing, machinery, import/export, engineering (grey/orange/dark blue)
- interior: furniture, home decor, architecture (cream/charcoal/wood)
- colorful_retail: toys, gifts, lifestyle, stationery (bright modern palette)

Business industry: {industry or "not specified"}
Business description: {description or "not specified"}
Target audience: {target_audience or "not specified"}"""

    try:
        reply = ai_provider.generate_reply(
            system_prompt="You are a design consultant picking a website theme. Respond with only the requested JSON.",
            history=[{"role": "user", "content": prompt}],
        )
        match = re.search(r'"theme"\s*:\s*"(\w+)"', reply)
        if match and match.group(1) in THEME_IDS:
            return match.group(1)  # type: ignore[return-value]
        return fallback
    except AIProviderNotConfiguredError:
        return fallback
    except Exception:
        return fallback
