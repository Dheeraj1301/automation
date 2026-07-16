"""AI provider interface for the Sales Agent. AnthropicProvider is the only
implementation for now; the interface exists so a future provider swap (or a
test double) never touches calling code.
"""

from abc import abstractmethod

import anthropic

from app.core.config import settings
from app.services.base import ExternalServiceInterface

MAX_REPLY_TOKENS = 1024


class AIProviderNotConfiguredError(Exception):
    """Raised when ANTHROPIC_API_KEY is not set."""


class AIProvider(ExternalServiceInterface):
    @abstractmethod
    def generate_reply(self, system_prompt: str, history: list[dict[str, str]]) -> str: ...


class AnthropicProvider(AIProvider):
    def generate_reply(self, system_prompt: str, history: list[dict[str, str]]) -> str:
        if not settings.ANTHROPIC_API_KEY:
            raise AIProviderNotConfiguredError(
                "The AI Sales Agent is not configured. Add ANTHROPIC_API_KEY to your local .env."
            )

        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        response = client.messages.create(
            model=settings.ANTHROPIC_MODEL,
            max_tokens=MAX_REPLY_TOKENS,
            system=system_prompt,
            messages=history,
        )
        return "".join(block.text for block in response.content if block.type == "text")


ai_provider: AIProvider = AnthropicProvider()
