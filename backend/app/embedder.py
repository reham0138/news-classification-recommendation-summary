"""Turns text into embedding vectors. The only place that touches the big BGE model."""
from __future__ import annotations

import threading
from typing import Protocol

import numpy as np


class Embedder(Protocol):
    def encode(self, texts: list[str]) -> np.ndarray:
        """Return float32 array of shape (len(texts), dim), L2-normalised."""


class BgeEmbedder:
    """SentenceTransformer wrapper. Loaded once at API start-up (takes ~10-30 s, ~1.3 GB)."""

    def __init__(self, model_name: str):
        # Imported here so tests and the training script don't need torch installed.
        from sentence_transformers import SentenceTransformer

        self.model_name = model_name
        self._model = SentenceTransformer(model_name)
        # A single shared model is not guaranteed thread-safe on every backend.
        self._lock = threading.Lock()

    def encode(self, texts: list[str]) -> np.ndarray:
        with self._lock:
            vecs = self._model.encode(
                texts,
                batch_size=16,
                normalize_embeddings=True,
                show_progress_bar=False,
            )
        return np.asarray(vecs, dtype="float32")
