"""Request / response shapes. FastAPI turns these into the OpenAPI docs at /docs,
which is also the contract your React code is written against."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator

MAX_CHARS = 30000


class _TextIn(BaseModel):
    text: str = Field(..., max_length=MAX_CHARS, description="The news article text.")

    @field_validator("text")
    @classmethod
    def not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("text must not be empty")
        return v


class ClassifyRequest(_TextIn):
    top_k: int = Field(3, ge=1, le=14)


class AnalyzeRequest(_TextIn):
    top_k_categories: int = Field(3, ge=1, le=14)
    top_k_similar: int = Field(5, ge=0, le=20)
    same_category: bool = Field(
        False, description="Only return similar articles from the predicted category."
    )
    min_similarity: float | None = Field(
        None, ge=-1.0, le=1.0, description="Drop results below this cosine similarity. Default: no cut-off."
    )


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=2, max_length=500)
    top_k: int = Field(8, ge=1, le=30)
    category: str | None = Field(None, description="Restrict results to one category.")
    min_similarity: float | None = Field(
        None, ge=-1.0, le=1.0, description="Drop results below this cosine similarity. Default: no cut-off."
    )


class SummarizeRequest(_TextIn):
    length: Literal["one_sentence", "short", "detailed"] = "short"


class PredictionOut(BaseModel):
    label: str
    probability: float


class SimilarArticleOut(BaseModel):
    id: int
    title: str
    snippet: str
    category: str
    similarity: float


class ClassifyResponse(BaseModel):
    top_category: str
    confident: bool = Field(description="False when the top probability is below the threshold.")
    predictions: list[PredictionOut]
    warnings: list[str]


class AnalyzeResponse(ClassifyResponse):
    similar: list[SimilarArticleOut]


class SearchResponse(BaseModel):
    results: list[SimilarArticleOut]


class MetaResponse(BaseModel):
    categories: list[str]
    algorithm: str
    embedding_model: str
    corpus_size: int
    confidence_threshold: float
    min_words: int
    recommended_words: int
    metrics: dict
    trained_at: str


class HealthResponse(BaseModel):
    status: str


class TraceStep(BaseModel):
    step: int
    tool: str
    args: dict
    reason: str


class SummarizeResponse(BaseModel):
    complete: bool = Field(description="True if the agent finished by saving the summary.")
    stop_reason: str
    steps: int
    tokens_used: int
    category: str | None
    category_confident: bool | None
    headline: str | None
    summary: str | None
    key_points: list[str]
    related: list[SimilarArticleOut]
    trace: list[TraceStep] = Field(description="What the agent did, step by step, with its reasons.")
