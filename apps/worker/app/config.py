from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    redis_url: str = "redis://localhost:6379"
    queue_key: str = "jobs:queue"
    # In-flight list for the reliable-queue pattern: a job is moved here atomically as it is taken
    # and removed only once it has reached a terminal state, so a crash mid-job leaves the envelope
    # recoverable instead of gone. See consumer.py.
    processing_key: str = "jobs:processing"
    clickhouse_host: str = "localhost"
    clickhouse_port: int = 8123


settings = Settings()  # type: ignore[call-arg]
