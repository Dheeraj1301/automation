"""Generates personalized outreach drafts referencing a prospect's public
info. Never sent automatically - the merchant reviews and edits before
sending it themselves through their own email/LinkedIn/contact form.
"""

from app.services.ai_provider import ai_provider

CHANNEL_INSTRUCTIONS = {
    "email": (
        "Write a short, professional cold outreach EMAIL. Include a compelling subject line on its own "
        "first line prefixed 'Subject: ', then the email body."
    ),
    "linkedin": "Write a short LinkedIn connection/message note (under 300 characters), no subject line.",
    "contact_form": (
        "Write a short message suitable for pasting into this company's own website contact form - "
        "no subject line, get straight to the point."
    ),
}


def generate_outreach_draft(channel: str, company_name: str, ai_summary: dict, icp: dict, merchant_name: str) -> dict:
    """Returns {"subject": str | None, "body": str}.

    Lets AIProviderNotConfiguredError propagate uncaught - callers should
    surface that as a clear 503, not silently fabricate a draft.
    """
    instructions = CHANNEL_INSTRUCTIONS.get(channel, CHANNEL_INSTRUCTIONS["email"])

    prompt = f"""{instructions}

From: {merchant_name}, who sells: {icp.get("product_name", "")} - {icp.get("product_description", "")}

To: {company_name}
What we know about them (from their own public website): {ai_summary.get("what_they_sell") or "Not enough public information available - keep the message general but still specific to their industry."}
Their likely customers: {ai_summary.get("customers", "")}
Potential interest in our product: {ai_summary.get("potential_interest", "")}

Reference their business specifically and explain why our product may be relevant to them. Keep it genuine and non-generic - avoid corporate cliches. Do not invent facts about their company beyond what's given above."""

    reply = ai_provider.generate_reply(
        system_prompt="You write concise, genuine B2B outreach messages. Never invent facts about the recipient's company.",
        history=[{"role": "user", "content": prompt}],
    )

    if channel == "email":
        lines = reply.strip().split("\n")
        if lines and lines[0].lower().startswith("subject:"):
            subject = lines[0].split(":", 1)[1].strip()
            body = "\n".join(lines[1:]).strip()
        else:
            subject = f"Quick question for {company_name}"
            body = reply.strip()
        return {"subject": subject, "body": body}

    return {"subject": None, "body": reply.strip()}
