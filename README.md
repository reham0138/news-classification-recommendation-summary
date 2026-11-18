# News Intelligence — production backend

Paste a news article → get its category (with probabilities) and the most similar articles.
Also: free-text semantic search over the corpus.

**One classifier:** calibrated LinearSVC on BGE-large embeddings — the winner of your notebook
comparison (val F1 0.792, test F1 0.797, 5-fold CV 0.793 ± 0.008; fastest and simplest of the four).

```
backend/
  training/train.py     one script: data -> evaluate -> fit -> save artifacts
  app/                  the API (FastAPI)
    engine.py           embed -> classify / similar / search
    agent.py            tool-using summary agent
    main.py             endpoints          schemas.py   request/response shapes
  artifacts/            created by train.py (not in git)
  tests/                smoke tests (no model download needed)
```

## Step 1 — set up (once)

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate            # Windows   (macOS/Linux: source .venv/bin/activate)
pip install -r requirements-dev.txt
pytest                            # 22 tests should pass
```

## Step 2 — train and export artifacts

Use the two files your notebook already produced (cleaned CSV + its embeddings):

```bash
python -m training.train --data PATH\TO\final_data_V2.csv --embeddings PATH\TO\final_data_embeddings.npy
```

It prints the metrics and writes `artifacts/` (~50 MB: model, corpus embeddings, corpus.csv, metrics.json).
Re-run it any time you change the data. No UMAP/HDBSCAN files are needed any more.

## Step 3 — run the API

```bash
uvicorn app.main:app --port 8000
```

First start downloads/loads the BGE model (~1.3 GB, 10–30 s). Then open
http://localhost:8000/docs — an interactive page where you can try every endpoint.

## API contract (what React calls)

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/api/v1/summarize` | `{text, length: "one_sentence"\|"short"\|"detailed"}` | `{complete, stop_reason, steps, tokens_used, category, category_confident, headline, summary, key_points, related, trace}` (local Ollama by default) |
| GET | `/health` | – | `{status: "ok" \| "loading"}` |
| GET | `/api/v1/meta` | – | categories, model info, metrics, thresholds (for labels/colours/footer) |
| POST | `/api/v1/classify` | `{text, top_k=3}` | `{top_category, confident, predictions:[{label, probability}], warnings}` |
| POST | `/api/v1/analyze` | `{text, top_k_categories=3, top_k_similar=5, same_category=false, min_similarity?}` | classify result + `similar:[{id,title,snippet,category,similarity}]` |
| POST | `/api/v1/search` | `{query, top_k=8, category?, min_similarity?}` | `{results:[{id,title,snippet,category,similarity}]}` |

- The "Analyze" button in the page should call **`/analyze`** (one request, one embedding pass).
- `confident: false` means the top probability is below 0.50 → show a "low confidence" badge (this replaces the old "Miscellaneous/noise" idea).
- Errors: `422` = bad input (too short < 20 words, blank, unknown category), `503` = model still loading.
- CORS already allows `http://localhost:5173` (Vite) and `:3000`. Add more with `CORS_ORIGINS="https://my.site,http://localhost:5173"`.

Quick test from a terminal:

```bash
curl -X POST http://localhost:8000/api/v1/analyze -H "Content-Type: application/json" ^
     -d "{\"text\": \"<paste 200+ words>\", \"top_k_similar\": 3}"
```

## The summary agent (`app/agent.py`)

Same pattern as your `Reham_Mayea_Examples_3` notebook: the local Ollama model chooses which tools
to call, our code sets the rules. The default is `qwen3:0.6b`; you can switch to `gemma3:1b`. If the model returns plain text instead of tool calls, or the provider explicitly rejects tool calling
(for example, Ollama's `gemma3:1b`), the backend falls back to a direct structured summary request
without sending tool definitions. The summary is then saved by the backend.

| Tool | Type | What it does |
|---|---|---|
| `get_article_overview` | LOOK | word count + first 300 characters |
| `classify_article` | LOOK | **your trained classifier** → category + confidence |
| `find_related_articles` | LOOK | **your corpus index** → similar articles |
| `extract_key_points` | ACT | LLM, structured JSON, only facts from the article |
| `write_summary` | ACT | LLM headline + summary (`one_sentence` / `short` / `detailed`, optional focus) |
| `save_summary` | ACT | finish (refuses if no summary exists yet) |

Every call carries a `reason`; the API returns them as `trace`, so the React page can show "what the agent did".
Stop conditions: `save_summary` succeeded, `AGENT_MAX_STEPS` (12), or `AGENT_TOKEN_BUDGET` (40,000 tokens,
counting the LLM calls made inside the tools too). If it stops early, the draft summary (if any) is still returned with
`complete: false`; if nothing was produced the API answers `502`.

Summarising uses Ollama locally by default; no Hugging Face key is required. Install and start Ollama, then pull one of the supported local models:

```powershell
ollama pull qwen3:0.6b
# Optional alternative:
ollama pull gemma3:1b
```

Start the backend with the default model (`qwen3:0.6b`):

```powershell
uvicorn app.main:app --port 8000
```

To use Gemma 3 1B instead, set the model before starting the server:

```powershell
$env:LOCAL_LLM_MODEL="gemma3:1b"
uvicorn app.main:app --port 8000
```

Ollama must be running at `http://localhost:11434`. Override `LOCAL_LLM_URL` if it listens elsewhere.
The tests use a scripted fake LLM, so they check the agent loop and fallback behavior, not the quality of either local model; test both with real articles. Hugging Face remains an optional provider (`LLM_PROVIDER=huggingface` plus `HF_API_KEY`), not the default.

## Settings (environment variables, all optional)

`ARTIFACTS_DIR`, `CONFIDENCE_THRESHOLD` (0.50), `MIN_WORDS` (20), `RECOMMENDED_WORDS` (200), `CORS_ORIGINS`,
`HF_API_KEY` (optional remote provider), `LLM_PROVIDER` (`ollama` by default), `LOCAL_LLM_URL` (`http://localhost:11434/v1`), `LOCAL_LLM_MODEL` (`qwen3:0.6b`, or `gemma3:1b`), `LLM_MODEL` (remote Hugging Face model), `AGENT_MAX_STEPS` (12), `AGENT_TOKEN_BUDGET` (40000).

## What changed vs. the Streamlit app, and why

- **Dropped UMAP + HDBSCAN from serving.** They added a 145 MB model, slow start-up and a fragile
  `approximate_predict` step, and the classifier does not use them. They stay in the notebook as your
  clustering analysis. "Similar articles" is now plain cosine search (optionally limited to the predicted category).
- **Dropped the voting ensemble and the other 3 algorithms** — the notebook already chose LinearSVC over the ensemble.
- **No prefix when embedding articles.** The old app prepended `"Represent this sentence: "` at inference, but the
  classifier was trained on embeddings made *without* it, so train and serve didn't match. Articles are now embedded
  exactly like the training corpus; only short `/search` queries use BGE's official query instruction.
- Replaced the rule-based "summary" text with structured data; the React page builds its own wording.
- Model bundle records the scikit-learn version and embedding model name and refuses to start on an embedding-model mismatch.

## Next steps

1. React page (Vite + TypeScript): textarea + word counter → `/analyze` → probability bars + similar-article cards; a "Summarize" button → `/summarize` (show the agent `trace`); a search box → `/search`.
2. Deployment: Docker image for the backend; build the React app and host it anywhere static.
