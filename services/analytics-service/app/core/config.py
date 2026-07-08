from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"
    port: int = 8000

    database_url: str = "postgresql+asyncpg://backend:backend@localhost:5432/analytics"

    redis_url: str = "redis://localhost:6379"
    tip_events_channel: str = "tips:events"

    stellar_network: str = "testnet"
    stellar_horizon_url: str = "https://horizon-testnet.stellar.org"
    stellar_watched_account: str = ""

    log_level: str = "INFO"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
