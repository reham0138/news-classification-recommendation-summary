"""FastAPI app. Run with:  uvicorn app.main:app --port 8000"""
from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from dataclasses import asdict

from fastapi import APIRouter, Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

from . import schemas
from .agent import SummaryAgent
from .config import Settings, get_settings
from .embedder import BgeEmbedder
from .engine import Engine, check_artifacts
from .local_llm import LocalChatClient
from .text import word_count

log = logging.getLogger("news-api")


# --- Which LLM runs the summary agent ---------------------------------------------------------
# Default: a local Ollama server (no account, no credits, nothing to configure).
#   LOCAL_LLM_MODEL   model name exactly as `ollama list` shows it   (default: qwen3:0.6b)
#   LOCAL_LLM_URL     Ollama's OpenAI-compatible address              (default: http://localhost:11434/v1)
# To use Hugging Face instead:  set LLM_PROVIDER=huggingface  and  HF_API_KEY=hf_...
def _provider() -> str:
    return os.getenv("LLM_PROVIDER", "ollama").strip().lower()


def make_llm_client(settings: Settings):
    """LLM client for the summary agent (None = summaries disabled)."""
    if _provider() == "huggingface":
        if not settings.hf_api_key:
            return None
        from huggingface_hub import InferenceClient

        return InferenceClient(api_key=settings.hf_api_key)
    return LocalChatClient(os.getenv("LOCAL_LLM_URL", "http://localhost:11434/v1"))


def llm_model_name(settings: Settings) -> str:
    if _provider() == "huggingface":
        return settings.llm_model
    return os.getenv("LOCAL_LLM_MODEL", "qwen3:0.6b")


def create_app(
    engine: Engine | None = None,
    settings: Settings | None = None,
    llm_client=None,
) -> FastAPI:
    """`engine` and `llm_client` can be injected (tests do this); otherwise built at start-up."""
    settings = settings or get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        app.state.llm_client = llm_client or make_llm_client(settings)
        if app.state.llm_client is None:
            log.warning("No LLM configured: /api/v1/summarize is disabled (set HF_API_KEY, or use the default local Ollama).")
        if engine is not None:
            app.state.engine = engine
        else:
            check_artifacts(settings)
            log.info("Loading embedding model %s ...", settings.embedding_model)
            app.state.engine = Engine(BgeEmbedder(settings.embedding_model), settings)
            log.info("Ready: %d articles indexed.", app.state.engine.corpus_size)
        yield

    app = FastAPI(title="News Intelligence API", version="1.0.0", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["GET", "POST"],
        allow_headers=["*"],
    )

    def get_engine(request: Request) -> Engine:
        eng = getattr(request.app.state, "engine", None)
        if eng is None:
            raise HTTPException(503, "Model is still loading, try again in a moment.")
        return eng

    def check_length(eng: Engine, text: str) -> None:
        if word_count(text) < eng.settings.min_words:
            raise HTTPException(
                422, f"Text is too short: at least {eng.settings.min_words} words are required."
            )

    api = APIRouter(prefix="/api/v1")

    @api.get("/meta", response_model=schemas.MetaResponse)
    def meta(eng: Engine = Depends(get_engine)):
        b = eng.bundle
        return schemas.MetaResponse(
            categories=eng.classes,
            algorithm=b["algorithm"],
            embedding_model=b["embedding_model"],
            corpus_size=eng.corpus_size,
            confidence_threshold=eng.settings.confidence_threshold,
            min_words=eng.settings.min_words,
            recommended_words=eng.settings.recommended_words,
            metrics=b["metrics"],
            trained_at=b["trained_at"],
        )

    @api.post("/classify", response_model=schemas.ClassifyResponse)
    def classify(body: schemas.ClassifyRequest, eng: Engine = Depends(get_engine)):
        check_length(eng, body.text)
        preds, confident, _ = eng.classify(body.text, body.top_k)
        return schemas.ClassifyResponse(
            top_category=preds[0].label,
            confident=confident,
            predictions=[asdict(p) for p in preds],
            warnings=eng.input_warnings(body.text),
        )

    @api.post("/analyze", response_model=schemas.AnalyzeResponse)
    def analyze(body: schemas.AnalyzeRequest, eng: Engine = Depends(get_engine)):
        """Classify an article and find similar ones. One embedding pass for both."""
        check_length(eng, body.text)
        preds, confident, vec = eng.classify(body.text, body.top_k_categories)
        similar = []
        if body.top_k_similar:
            similar = eng.similar(
                vec,
                body.top_k_similar,
                category=preds[0].label if body.same_category else None,
                min_similarity=body.min_similarity,
            )
        return schemas.AnalyzeResponse(
            top_category=preds[0].label,
            confident=confident,
            predictions=[asdict(p) for p in preds],
            warnings=eng.input_warnings(body.text),
            similar=[asdict(s) for s in similar],
        )

    @api.post("/search", response_model=schemas.SearchResponse)
    def search(body: schemas.SearchRequest, eng: Engine = Depends(get_engine)):
        if body.category is not None and body.category not in eng.classes:
            raise HTTPException(422, f"Unknown category '{body.category}'. Valid: {eng.classes}")
        results = eng.search(body.query, body.top_k, body.category, body.min_similarity)
        return schemas.SearchResponse(results=[asdict(r) for r in results])

    @api.post("/summarize", response_model=schemas.SummarizeResponse)
    def summarize(body: schemas.SummarizeRequest, request: Request, eng: Engine = Depends(get_engine)):
        """Run the summary agent. Takes ~10-40 s (several LLM calls), so show a spinner in the UI."""
        client = request.app.state.llm_client
        if client is None:
            raise HTTPException(503, "Summarising is not configured: set the HF_API_KEY environment variable (LLM_PROVIDER=huggingface).")
        check_length(eng, body.text)
        agent = SummaryAgent(eng, client, llm_model_name(settings), settings.agent_max_steps,
                             settings.agent_token_budget)
        result = agent.run(body.text, body.length)
        if result.summary is None:
            raise HTTPException(502, f"The agent could not produce a summary: {result.stop_reason}")
        return asdict(result)

    @app.get("/health", response_model=schemas.HealthResponse)
    def health(request: Request):
        ready = getattr(request.app.state, "engine", None) is not None
        return schemas.HealthResponse(status="ok" if ready else "loading")

    app.include_router(api)
    return app


# Module-level app for `uvicorn app.main:app`. Importing this module does NOT load the model;
# that happens in the lifespan hook when the server starts.
app = create_app()
