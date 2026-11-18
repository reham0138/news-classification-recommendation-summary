"""
Train the production classifier and export everything the API needs.

    python -m training.train \
        --data ../../final_data_V2.csv \
        --embeddings ../../final_data_embeddings.npy

Recipe = the winner of the notebook comparison (section 7): LinearSVC with
class_weight="balanced", sigmoid-calibrated (cv=3) so it outputs probabilities.
The other algorithms (RandomForest, LogisticRegression, HistGradientBoosting, the voting
ensemble) are not needed in production, so they are not trained here.

Outputs (in --out, default ../artifacts):
    model_bundle.joblib      classifier + class list + metrics + version info
    corpus_embeddings.npy    float32 (N, 1024), L2-normalised, for similar-article search
    corpus.csv               id, title, snippet, category (row i matches embeddings[i])
    metrics.json             human-readable evaluation report
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import accuracy_score, classification_report, f1_score
from sklearn.model_selection import train_test_split
from sklearn.svm import LinearSVC

from app.text import CATEGORY_MAP

RANDOM_STATE = 42
SNIPPET_CHARS = 400
CONFIDENCE_THRESHOLD = 0.50  # keep in sync with app.config.Settings.confidence_threshold


def make_classifier() -> CalibratedClassifierCV:
    """The single production algorithm."""
    return CalibratedClassifierCV(
        LinearSVC(class_weight="balanced", max_iter=5000, C=1.0),
        method="sigmoid",
        cv=3,
    )


def load_inputs(data_path: Path, emb_path: Path) -> tuple[pd.DataFrame, np.ndarray]:
    df = pd.read_csv(data_path)
    emb = np.load(emb_path).astype("float32")

    for col in ("title", "content", "category"):
        if col not in df.columns:
            sys.exit(f"ERROR: {data_path.name} has no '{col}' column (found {list(df.columns)}).")
    if len(df) != len(emb):
        sys.exit(
            f"ERROR: {data_path.name} has {len(df)} rows but {emb_path.name} has {len(emb)}. "
            "Row i of the CSV must match embedding i. Re-generate the embeddings from this exact CSV."
        )

    df["category_norm"] = df["category"].astype(str).str.lower().str.strip().map(CATEGORY_MAP)
    unmapped = df["category_norm"].isna()
    if unmapped.any():
        print(f"WARNING: dropping {int(unmapped.sum())} rows with unmapped categories: "
              f"{sorted(df.loc[unmapped, 'category'].astype(str).unique())}")
    df, emb = df[~unmapped].reset_index(drop=True), emb[~unmapped.values]

    # The classifier is trained on these vectors, and the API will feed it vectors from
    # `normalize_embeddings=True`. They must live on the same scale.
    mean_norm = float(np.linalg.norm(emb, axis=1).mean())
    if abs(mean_norm - 1.0) > 0.01:
        print(f"NOTE: embeddings are not unit length (mean norm {mean_norm:.3f}); normalising them.")
        emb = emb / np.linalg.norm(emb, axis=1, keepdims=True)
    return df, emb


def evaluate(X, y, X_val, y_val, X_test, y_test) -> dict:
    model = make_classifier().fit(X, y)
    out: dict = {}
    for name, (Xs, ys) in {"val": (X_val, y_val), "test": (X_test, y_test)}.items():
        pred = model.predict(Xs)
        out[f"{name}_f1_macro"] = round(float(f1_score(ys, pred, average="macro")), 4)
        out[f"{name}_accuracy"] = round(float(accuracy_score(ys, pred)), 4)

    # How much to trust the confidence flag: accuracy on the articles the API calls "confident".
    proba = model.predict_proba(X_test)
    top = proba.max(axis=1)
    pred = model.classes_[proba.argmax(axis=1)]
    keep = top >= CONFIDENCE_THRESHOLD
    out["confidence_threshold"] = CONFIDENCE_THRESHOLD
    out["test_coverage_at_threshold"] = round(float(keep.mean()), 4)
    out["test_accuracy_at_threshold"] = round(float(accuracy_score(y_test[keep], pred[keep])), 4)
    out["test_report"] = classification_report(y_test, pred, output_dict=True, zero_division=0)
    return out


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawTextHelpFormatter)
    ap.add_argument("--data", type=Path, required=True, help="cleaned CSV (final_data_V2.csv)")
    ap.add_argument("--embeddings", type=Path, required=True, help="matching .npy (final_data_embeddings.npy)")
    ap.add_argument("--out", type=Path, default=Path(__file__).resolve().parent.parent / "artifacts")
    ap.add_argument("--embedding-model", default="BAAI/bge-large-en-v1.5")
    ap.add_argument("--no-refit", action="store_true",
                    help="ship the model trained on the 70%% split instead of refitting on all data")
    args = ap.parse_args()

    df, emb = load_inputs(args.data, args.embeddings)
    y = df["category_norm"].to_numpy()
    print(f"{len(df)} articles, {len(set(y))} categories, embedding dim {emb.shape[1]}")

    # Same split as the notebook: 70 / 15 / 15, stratified, seed 42.
    X_tr, X_tmp, y_tr, y_tmp = train_test_split(emb, y, test_size=0.30, random_state=RANDOM_STATE, stratify=y)
    X_val, X_te, y_val, y_te = train_test_split(X_tmp, y_tmp, test_size=0.50, random_state=RANDOM_STATE, stratify=y_tmp)

    print("Evaluating on held-out data ...")
    metrics = evaluate(X_tr, y_tr, X_val, y_val, X_te, y_te)
    print(f"  val  F1-macro {metrics['val_f1_macro']}  acc {metrics['val_accuracy']}")
    print(f"  test F1-macro {metrics['test_f1_macro']}  acc {metrics['test_accuracy']}")
    print(f"  at confidence >= {CONFIDENCE_THRESHOLD}: covers {metrics['test_coverage_at_threshold']:.0%} "
          f"of test articles with accuracy {metrics['test_accuracy_at_threshold']}")

    if args.no_refit:
        final = make_classifier().fit(X_tr, y_tr)
        trained_on = len(X_tr)
    else:
        print("Refitting the same recipe on all data for the shipped model ...")
        final = make_classifier().fit(emb, y)
        trained_on = len(emb)

    args.out.mkdir(parents=True, exist_ok=True)
    bundle = {
        "model": final,
        "classes": [str(c) for c in final.classes_],
        "embedding_model": args.embedding_model,
        "embedding_dim": int(emb.shape[1]),
        "algorithm": "CalibratedClassifierCV(LinearSVC, class_weight=balanced, sigmoid, cv=3)",
        "trained_on_rows": trained_on,
        "trained_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "sklearn_version": sklearn.__version__,
        "metrics": {k: v for k, v in metrics.items() if k != "test_report"},
    }
    joblib.dump(bundle, args.out / "model_bundle.joblib", compress=3)

    # Retrieval index: float32, unit length, so cosine similarity == dot product.
    np.save(args.out / "corpus_embeddings.npy", emb.astype("float32"))
    corpus = pd.DataFrame({
        "id": np.arange(len(df)),
        "title": df["title"].fillna("").astype(str),
        "snippet": df["content"].astype(str).str.slice(0, SNIPPET_CHARS),
        "category": df["category_norm"],
    })
    corpus.to_csv(args.out / "corpus.csv", index=False)

    with open(args.out / "metrics.json", "w", encoding="utf-8") as f:
        json.dump({**{k: v for k, v in bundle.items() if k != "model"}, "test_report": metrics["test_report"]},
                  f, indent=2)

    print(f"\nSaved to {args.out.resolve()}:")
    for p in sorted(args.out.iterdir()):
        print(f"  {p.name:26s} {p.stat().st_size / 1e6:8.1f} MB")


if __name__ == "__main__":
    main()
