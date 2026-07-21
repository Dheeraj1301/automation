from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    ENV: str = "local"
    DATABASE_URL: str = "postgresql://profitpilot:profitpilot@localhost:5432/profitpilot"
    REDIS_URL: str = "redis://localhost:6379/0"

    JWT_SECRET: str = "change-me"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:3001"]

    # Merchant dashboard base URL - used to build post-OAuth redirect
    # targets (e.g. after connecting Zoho). https://app.<domain> in prod.
    FRONTEND_URL: str = "http://localhost:3000"

    # Encrypts secrets stored at rest (OAuth tokens). 32-byte urlsafe-base64
    # Fernet key - generate with: python -c "from cryptography.fernet import
    # Fernet; print(Fernet.generate_key().decode())". Falls back to a key
    # derived from JWT_SECRET for local dev convenience; production should
    # set this explicitly (see .env.production.example).
    TOKEN_ENCRYPTION_KEY: str = ""

    # AI Sales Agent (Phase 7) - unset by default. Set your own key in a
    # git-ignored local .env; never paste it into chat. The agent returns a
    # clear 503 until this is configured.
    ANTHROPIC_API_KEY: str = ""
    ANTHROPIC_MODEL: str = "claude-opus-4-8"

    # Workflow engine (Phase 8) - n8n runs as its own container. Webhook
    # paths match the two workflows in n8n/workflows/. If n8n is down or a
    # workflow isn't imported/activated yet, triggering it fails silently
    # (logged, never raised) so lead capture is never blocked by it.
    N8N_BASE_URL: str = "http://n8n:5678"
    N8N_WEBHOOK_PATH_LEAD_WHATSAPP: str = "new-lead-whatsapp"
    N8N_WEBHOOK_PATH_LEAD_CRM: str = "new-lead-crm"
    N8N_WEBHOOK_TIMEOUT_SECONDS: float = 3.0

    # Zoho CRM (Phase 9+) - each merchant connects their own Zoho account via
    # OAuth (Settings > Integrations); nothing here is a shared credential.
    # Register a free "Server-based Application" at
    # https://api-console.zoho.com/ to get a client id/secret. Unset by
    # default - the CRM sync silently stays mocked (logged, not sent) until
    # an org actually connects.
    ZOHO_CLIENT_ID: str = ""
    ZOHO_CLIENT_SECRET: str = ""
    # Must exactly match the redirect URI registered in the Zoho API
    # Console: https://api.<domain>/api/integrations/zoho/callback in prod.
    ZOHO_REDIRECT_URI: str = "http://localhost:8000/api/integrations/zoho/callback"
    # Regional data center base URLs - swap for .eu/.in/.com.au/.jp/.ca to
    # match where the connecting merchant's Zoho account is hosted. Only
    # matters if you need to hardcode one; the OAuth flow itself returns the
    # correct api_domain per-connection, which is what's actually used for
    # API calls after connecting.
    ZOHO_ACCOUNTS_BASE_URL: str = "https://accounts.zoho.com"
    ZOHO_API_TIMEOUT_SECONDS: float = 8.0

    # Rate limiting (Redis-backed) for unauthenticated public endpoints.
    RATE_LIMIT_PUBLIC_LEADS_PER_MINUTE: int = 10
    # Higher than leads since a real chat is several messages back-to-back,
    # but still capped - each message is a real, billed Anthropic call.
    RATE_LIMIT_PUBLIC_AI_CHAT_PER_MINUTE: int = 20


settings = Settings()
