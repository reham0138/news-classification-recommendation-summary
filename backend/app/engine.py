"""
The whole inference pipeline in one object, loaded once at start-up.

    text -> clean -> embed (BGE) -> classifier probabilities
                          \\-> cosine search over the corpus index
"""
from __future__ import annotations

import warnings
from dataclasses import dataclass

import joblib
import numpy as np
import pandas as pd
import sklearn

from .config import Settings
from .embedder import Embedder
from .text import clean_text, word_count


@dataclass
class Prediction:
    label: str
    probability: float


@dataclass
class SimilarArticle:
    id: int
    title: str
    snippet: str
    category: str
    similarity: float


class ArtifactsMissing(RuntimeError):
    pass


def check_artifacts(s: Settings) -> None:
    """Fail fast (before the slow embedding-model load) if training hasn't been run."""
    missing = [p.name for p in (s.bundle_path, s.embeddings_path, s.corpus_path) if not p.exists()]
    if missing:
        raise ArtifactsMissing(
            f"Missing {missing} in {s.artifacts_dir}. Run `python -m training.train ...` first."
        )


class Engine:
    def __init__(self, embedder: Embedder, settings: Settings):
        self.settings = settings
        self.embedder = embedder
        self._load_artifacts()

    # ------------------------------------------------------------------ loading
    def _load_artifacts(self) -> None:
        s = self.settings
        check_artifacts(s)

        bundle = joblib.load(s.bundle_path)
        if bundle["sklearn_version"] != sklearn.__version__:
            warnings.warn(
                f"Model was trained with scikit-learn {bundle['sklearn_version']} but "
                f"{sklearn.__version__} is installed. Re-run training if predictions look wrong."
            )
        if bundle["embedding_model"] != s.embedding_model:
            raise RuntimeError(
                f"Classifier was trained on '{bundle['embedding_model']}' embeddings but the API is "
                f"configured for '{s.embedding_model}'. They must match."
            )

        self.bundle = bundle
        self.model = bundle["model"]
        self.classes: list[str] = bundle["classes"]

        emb = np.load(s.embeddings_path).astype("float32")
        emb /= np.linalg.norm(emb, axis=1, keepdims=True)  # defensive: dot product == cosine
        self.index = emb
        self.corpus = pd.read_csv(s.corpus_path).fillna("")
        if len(self.corpus) != len(self.index):
            raise RuntimeError("corpus.csv and corpus_embeddings.npy have different row counts.")

    # --------------------------------------------------------------- public API
    @property
    def corpus_size(self) -> int:
        return len(self.index)

    def input_warnings(self, text: str) -> list[str]:
        n = word_count(text)
        if n < self.settings.recommended_words:
            return [
                f"Only {n} words. The model was trained on articles of 200-1000 words, "
                "so predictions for shorter text are less reliable."
            ]
        return []

    def classify(self, text: str, top_k: int = 3) -> tuple[list[Prediction], bool, np.ndarray]:
        """Returns (top-k predictions, confident?, the embedding so callers can reuse it)."""
        vec = self.embedder.encode([clean_text(text)])  # no prefix: same as the training corpus
        proba = self.model.predict_proba(vec)[0]
        order = np.argsort(proba)[::-1][:top_k]
        preds = [Prediction(self.classes[i], float(proba[i])) for i in order]
        confident = preds[0].probability >= self.settings.confidence_threshold
        return preds, confident, vec

    def similar(
        self,
        vec: np.ndarray,
        top_k: int = 5,
        category: str | None = None,
        min_similarity: float | None = None,
    ) -> list[SimilarArticle]:
        sims = self.index @ vec[0]
        floor = -np.inf if min_similarity is None else min_similarity
        if category is not None:
            sims = np.where(self.corpus["category"].to_numpy() == category, sims, -np.inf)
        top = np.argsort(sims)[::-1][:top_k]
        rows = self.corpus.iloc[top]
        return [
            SimilarArticle(int(r.id), r.title, r.snippet, r.category, float(sims[i]))
            for i, r in zip(top, rows.itertuples())
            if np.isfinite(sims[i]) and sims[i] >= floor
        ]

    def search(
        self,
        query: str,
        top_k: int = 8,
        category: str | None = None,
        min_similarity: float | None = None,
    ) -> list[SimilarArticle]:
        # Short query -> long article: BGE's official query instruction improves recall.
        vec = self.embedder.encode([self.settings.query_instruction + clean_text(query)])
        return self.similar(vec, top_k, category, min_similarity)
