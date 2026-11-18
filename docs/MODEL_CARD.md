# Model Card

## Model system

News Intelligence is a composite NLP system rather than one end-to-end neural network. It combines a pretrained sentence-embedding model, a supervised classifier, a dense retrieval index, and a separate generative summarization agent.

## Intended use

- Categorize English-language news articles into the project's supported topic taxonomy.
- Retrieve semantically similar items from the indexed news corpus.
- Search the local corpus with short natural-language queries.
- Produce draft summaries and key points for human review.

It is a research/portfolio project and is not intended to make high-stakes decisions or replace editorial verification.

## Classification model

| Property | Value |
|---|---|
| Text encoder | `BAAI/bge-large-en-v1.5` |
| Embedding dimension | 1,024 |
| Classifier | `CalibratedClassifierCV(LinearSVC)` |
| Class weighting | `balanced` |
| Probability calibration | Sigmoid, 3-fold CV |
| Number of categories | 14 |
| Default confidence threshold | 0.50 |
| Split for reported train-script evaluation | Stratified 70% / 15% / 15%, random seed 42 |

The BGE encoder is pretrained and used to create dense text representations. The LinearSVC classifier is the supervised component fitted on labeled article embeddings. The encoder is not fine-tuned in the checked-in training script.

## Categories

`crime`, `arts_entertainment`, `business`, `disaster`, `environment`, `education`, `health`, `lifestyle`, `politics`, `religion`, `science`, `sports`, `technology`, and `weather`.

The backend maps source-dataset labels into these normalized categories before training.

## Reported evaluation

The model-development notebook comparison recorded:

| Metric | Result |
|---|---:|
| Validation macro F1 | 0.792 |
| Held-out test macro F1 | 0.797 |
| 5-fold CV macro F1 | 0.793 ± 0.008 |

These values describe the reported experiment. They should not be treated as guaranteed results for a different dataset version, data split, or retraining environment. The checked-in `training/train.py` script computes fresh validation/test metrics and stores them in `metrics.json` when run.

## Retrieval

The same normalized BGE embedding space is used for corpus indexing and article/query vectors. The index stores float32 vectors. Ranking uses cosine similarity, implemented as a dot product after L2 normalization. Retrieval results are limited to the local corpus and do not imply factual similarity, agreement, or source credibility.

## Summarization component

The summary agent uses a local Ollama-served LLM. The default model is `qwen3:0.6b`; `gemma3:1b` is an alternative. The agent uses tool orchestration and structured JSON output for fact extraction and summary writing. It is a separate generative component and does not affect the classifier's category prediction.

The agent includes a fallback sequence for models without tool-calling support. Generated summaries remain model outputs and require human review.

## Data and reproducibility

The training script expects a cleaned CSV with `title`, `content`, and `category` columns and a precomputed embedding matrix generated from the exact same rows and BGE model. The dataset and generated binary artifacts are not included in this repository. Reproduction therefore requires access to the corresponding data and embeddings.

The training script records the embedding model name, embedding dimension, scikit-learn version, training timestamp, class labels, and evaluation metrics in the artifact bundle.

## Limitations and risks

- Domain shift, emerging topics, source style, and class imbalance can reduce classification performance.
- Calibrated probabilities and a 0.50 cutoff do not guarantee reliable confidence for every source or population.
- Similarity ranking can surface topically related but factually different articles.
- The small local LLM may omit nuance, misstate a figure, or produce unsupported claims despite fact-first prompting.
- The model is designed around English news text; performance on other languages is not established.
- The current corpus index is static and does not automatically ingest or verify new reporting.

## Recommended human review

Before publishing or relying on an output, verify the predicted category when confidence is low, inspect the source articles returned by retrieval, and compare summary names, dates, numbers, attributions, and claims with the original article.
