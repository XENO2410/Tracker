"""OpenRouter LLM client (OpenAI-compatible)."""
from functools import lru_cache

from openai import OpenAI

from ..config import get_settings


@lru_cache
def get_llm_client() -> OpenAI:
    s = get_settings()
    return OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=s.openrouter_api_key,
        default_headers={
            "HTTP-Referer": s.openrouter_app_url,
            "X-Title": s.openrouter_app_name,
        },
    )
