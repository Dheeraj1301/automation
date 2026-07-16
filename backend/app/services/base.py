"""
Interface pattern for external integrations added in later phases
(billing, Instagram, WhatsApp, CRM, etc). Each future integration should
define an abstract interface here-like and ship a Mock implementation
first, so the calling code never changes when the real provider lands.

No concrete integrations exist yet in Phase 1 - this module exists purely
to establish the pattern later phases will follow.
"""

from abc import ABC


class ExternalServiceInterface(ABC):
    """Marker base class for stubbed external service interfaces."""
