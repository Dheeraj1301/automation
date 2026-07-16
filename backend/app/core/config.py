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


settings = Settings()
