"""Central configuration. Every value can be overridden with an environment variable."""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent


def _split(value: str) -> list[str]:
    return [v.strip() for v in value.split(",") if v.strip()]


@dataclass(frozen=True)
class Settings:
    # Where train.py writes and the API reads its files.
    artifacts_dir: Path = Path(os.getenv("ARTIFACTS_DIR", BACKEND_DIR / "artifacts"))

    # MUST be the same model that produced the corpus embeddings used for training.
    embedding_model: str = os.getenv("EMBEDDING_MODEL", "BAAI/bge-large-en-v1.5")
    # Official BGE instruction for short *queries* searching long passages.
    # Only used by /search. Articles are embedded with no prefix, exactly like training.
    query_instruction: str = os.getenv(
        "QUERY_INSTRUCTION", "Represent this sentence for searching relevant passages: "
    )

    # Below this top-1 probability the API reports `confident: false`.
    confidence_threshold: float = float(os.getenv("CONFIDENCE_THRESHOLD", "0.50"))

    # Input limits (the 30,000-character cap lives in schemas.py).
    min_words: int = int(os.getenv("MIN_WORDS", "20"))          # reject shorter text
    recommended_words: int = int(os.getenv("RECOMMENDED_WORDS", "200"))  # warn below this

    # Browser origins allowed to call the API (Vite = 5173, Create React App = 3000).
    cors_origins: list[str] = field(
        default_factory=lambda: _split(
            os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000")
        )
    )

    # Summary agent (optional: the rest of the API works without a key).
    hf_api_key: str | None = field(default_factory=lambda: os.getenv("HF_API_KEY") or None, repr=False)
    llm_model: str = os.getenv("LLM_MODEL", "Qwen/Qwen3-32B")
    agent_max_steps: int = int(os.getenv("AGENT_MAX_STEPS", "12"))
    agent_token_budget: int = int(os.getenv("AGENT_TOKEN_BUDGET", "40000"))

    @property
    def bundle_path(self) -> Path:
        return self.artifacts_dir / "model_bundle.joblib"

    @property
    def embeddings_path(self) -> Path:
        return self.artifacts_dir / "corpus_embeddings.npy"

    @property
    def corpus_path(self) -> Path:
        return self.artifacts_dir / "corpus.csv"


def get_settings() -> Settings:
    return Settings()
