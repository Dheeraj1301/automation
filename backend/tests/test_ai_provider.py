import pytest

from app.core.config import settings
from app.services.ai_provider import AIProviderNotConfiguredError, AnthropicProvider


def test_anthropic_provider_raises_clear_error_when_unconfigured(monkeypatch):
    monkeypatch.setattr(settings, "ANTHROPIC_API_KEY", "")
    provider = AnthropicProvider()

    with pytest.raises(AIProviderNotConfiguredError, match="ANTHROPIC_API_KEY"):
        provider.generate_reply("system prompt", [{"role": "user", "content": "hi"}])
