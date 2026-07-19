from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    redis_url: str = "redis://localhost:6379"
    queue_key: str = "jobs:queue"
    clickhouse_host: str = "localhost"
    clickhouse_port: int = 8123


settings = Settings()  # type: ignore[call-arg]
