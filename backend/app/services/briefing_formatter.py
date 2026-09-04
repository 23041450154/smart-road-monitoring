import logging
from typing import Any, Protocol

import httpx

from app.core.config import Settings

log = logging.getLogger("briefing-formatter")


class BriefingFormatter(Protocol):
    def format(self, structured: dict[str, Any], fallback: str) -> str: ...


class TemplateFormatter:
    def format(self, structured: dict[str, Any], fallback: str) -> str:
        return fallback


class OpenAICompatibleFormatter:
    """Optional language-only formatter; it cannot alter calculated congestion data."""

    def __init__(self, url: str, api_key: str, model: str) -> None:
        self.url = url
        self.api_key = api_key
        self.model = model

    def format(self, structured: dict[str, Any], fallback: str) -> str:
        try:
            response = httpx.post(
                self.url,
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={
                    "model": self.model,
                    "messages": [
                        {
                            "role": "system",
                            "content": (
                                "Ubah JSON kondisi perjalanan menjadi pesan singkat "
                                "Bahasa Indonesia. "
                                "Jangan mengubah angka, status, atau menambahkan fakta."
                            ),
                        },
                        {"role": "user", "content": str(structured)},
                    ],
                    "temperature": 0.2,
                },
                timeout=10,
            )
            response.raise_for_status()
            return str(response.json()["choices"][0]["message"]["content"]).strip()
        except (httpx.HTTPError, KeyError, IndexError, TypeError) as exc:
            log.warning("[BRIEFING] optional LLM failed; using template: %s", exc)
            return fallback


def get_formatter(settings: Settings) -> BriefingFormatter:
    if (
        settings.briefing_mode.lower() == "llm"
        and settings.llm_api_url
        and settings.llm_api_key
        and settings.llm_model
    ):
        return OpenAICompatibleFormatter(
            settings.llm_api_url, settings.llm_api_key, settings.llm_model
        )
    return TemplateFormatter()
