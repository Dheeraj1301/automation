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


settings = Settings()
