import pytest

from app.services import outreach_generator
from app.services.ai_provider import AIProviderNotConfiguredError
from app.services.outreach_generator import generate_outreach_draft


def test_email_draft_extracts_subject_line(monkeypatch):
    def fake_generate_reply(*args, **kwargs):
        return "Subject: A quick idea for Acme Inc\n\nHi there, I noticed you sell widgets..."

    monkeypatch.setattr(outreach_generator.ai_provider, "generate_reply", fake_generate_reply)

    draft = generate_outreach_draft("email", "Acme Inc", {}, {}, "My Company")
    assert draft["subject"] == "A quick idea for Acme Inc"
    assert "widgets" in draft["body"]
    assert "Subject:" not in draft["body"]


def test_email_draft_falls_back_to_default_subject_when_missing(monkeypatch):
    def fake_generate_reply(*args, **kwargs):
        return "Hi there, I noticed you sell widgets..."

    monkeypatch.setattr(outreach_generator.ai_provider, "generate_reply", fake_generate_reply)

    draft = generate_outreach_draft("email", "Acme Inc", {}, {}, "My Company")
    assert draft["subject"] == "Quick question for Acme Inc"


def test_linkedin_draft_has_no_subject(monkeypatch):
    def fake_generate_reply(*args, **kwargs):
        return "Hi! Loved what you're building at Acme."

    monkeypatch.setattr(outreach_generator.ai_provider, "generate_reply", fake_generate_reply)

    draft = generate_outreach_draft("linkedin", "Acme Inc", {}, {}, "My Company")
    assert draft["subject"] is None
    assert draft["body"] == "Hi! Loved what you're building at Acme."


def test_propagates_ai_not_configured_error(monkeypatch):
    def fake_generate_reply(*args, **kwargs):
        raise AIProviderNotConfiguredError("no key")

    monkeypatch.setattr(outreach_generator.ai_provider, "generate_reply", fake_generate_reply)

    with pytest.raises(AIProviderNotConfiguredError):
        generate_outreach_draft("email", "Acme Inc", {}, {}, "My Company")
