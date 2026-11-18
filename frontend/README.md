# News Intelligence: frontend

A single-page React app for the News Intelligence API: classify an article, find similar
stories, get an agent-written summary, and search the archive.

Stack: Vite, React 19, TypeScript, Tailwind CSS v4. No other runtime libraries.

## Run it

You need Node 20+ and the backend running first.

**1. Start the backend** (in `backend/`, see the main README for training and setup):

```bash
cd backend
.venv\Scripts\activate            # Windows   (macOS/Linux: source .venv/bin/activate)
uvicorn app.main:app --port 8000
```

Summaries use a local Ollama model by default (no account or credits). Make sure Ollama is running and
the model exists (`ollama list`). The default is `qwen3:0.6b`; to use another, set `LOCAL_LLM_MODEL`
before starting the backend. To use Hugging Face instead: `LLM_PROVIDER=huggingface` and `HF_API_KEY=hf_...`.

The first start loads a ~1.3 GB model and takes 10–30 seconds. The API doesn't accept
connections until it is ready, so the page shows "Offline" until then and retries every 3 seconds.

**2. Start the frontend:**

```bash
cd frontend
npm install
cp .env.example .env              # Windows: copy .env.example .env  (optional)
npm run dev
```

Open http://localhost:5173 (the backend allows this origin for CORS).

## Settings

| Variable | Default | Meaning |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8000` | Base URL of the backend |

Only public values belong in `.env`. The LLM key (`HF_API_KEY`) stays on the backend.
If you serve the frontend from another origin, add it to the backend's `CORS_ORIGINS`.

## Other commands

```bash
npm run build       # type-check + production build into dist/
npm run preview     # serve the production build locally
npm run typecheck   # TypeScript only
```

## Code map

```
src/
  api.ts           typed client + error messages (the only file that calls fetch)
  hooks.ts         useRequest (one request at a time, aborts stale ones), useBackend (health + meta), useTheme
  lib.ts           category colours, formatting helpers
  examples.ts      the three example articles
  components/      Hero, Analyze, Summarize, Search, Footer and the small pieces they share
```

## Notes

- Categories, thresholds and metrics are read from `/api/v1/meta`; nothing is hardcoded except a
  colour per known category name (unknown names get a stable fallback colour).
- Summaries take 10–40 s. The progress panel shows the agent's usual order of steps, not live progress,
  because the API returns everything at once when the agent finishes.
- Errors are shown as plain sentences. Technical details (request ids, provider messages) are never shown on the page; they go to the browser console.
