"""Smoke tests on synthetic data: they check the plumbing (train -> bundle -> API), not model quality.
No internet or BGE model needed: a fake embedder stands in for it."""
import hashlib
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import Settings  # noqa: E402
from app.engine import Engine  # noqa: E402

DIM = 64
# one raw label per output class, so the label-mapping step is exercised too
RAW_LABELS = {
    "sports": "sports", "business": "business", "technology": "technology",
    "health": "health", "politics": "politics", "weather": "weather",
}


def _centroid(word: str) -> np.ndarray:
    seed = int(hashlib.md5(word.encode()).hexdigest()[:8], 16)
    v = np.random.default_rng(seed).normal(size=DIM)
    return v / np.linalg.norm(v)


class FakeEmbedder:
    """Maps text to the centroid of whichever category words it contains (+ tiny noise)."""

    def encode(self, texts):
        out = []
        for t in texts:
            v = sum((_centroid(w) * t.lower().count(w) for w in RAW_LABELS), np.zeros(DIM))
            if not np.any(v):
                v = _centroid("unknown")
            rng = np.random.default_rng(int(hashlib.md5(t.encode()).hexdigest()[:8], 16))
            v = v / np.linalg.norm(v) + rng.normal(scale=0.05, size=DIM)
            out.append(v / np.linalg.norm(v))
        return np.asarray(out, dtype="float32")


@pytest.fixture(scope="session")
def artifacts(tmp_path_factory):
    d = tmp_path_factory.mktemp("data")
    out = tmp_path_factory.mktemp("artifacts")
    rows = []
    for raw in RAW_LABELS:
        for i in range(60):
            rows.append({
                "title": f"{raw} story {i}",
                "content": (f"{raw} " * 30 + f"filler words number {i} " * 10).strip(),
                "category": raw,
            })
    df = pd.DataFrame(rows)
    df.to_csv(d / "data.csv", index=False)
    emb = FakeEmbedder().encode(df["content"].tolist())
    np.save(d / "emb.npy", emb)

    from training import train
    sys.argv = ["train", "--data", str(d / "data.csv"), "--embeddings", str(d / "emb.npy"), "--out", str(out)]
    train.main()
    return out


@pytest.fixture(scope="session")
def engine(artifacts):
    return Engine(FakeEmbedder(), Settings(artifacts_dir=artifacts, embedding_model="BAAI/bge-large-en-v1.5"))


@pytest.fixture()
def client(engine):
    from fastapi.testclient import TestClient
    from app.main import create_app
    with TestClient(create_app(engine=engine)) as c:
        yield c
