from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", case_sensitive=False)

    openrouter_api_key: str
    llm_parse_model: str = "openai/gpt-4o-mini"
    llm_report_model: str = "openai/gpt-4o"
    openrouter_app_url: str = "http://localhost:5173"
    openrouter_app_name: str = "Personal Body Recomp Tracker"

    google_spreadsheet_id: str
    google_service_account_file: str | None = None
    google_service_account_json: str | None = None

    timezone: str = "Asia/Kolkata"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
