# Frontend

React 19 + TypeScript + Vite + Tailwind CSS v4 interface for the News Intelligence API.

The frontend is intentionally a thin presentation layer: classification, embeddings, semantic retrieval, and LLM summarization run in the FastAPI backend.

## Run locally

Prerequisites: Node.js 20+ and a running backend at `http://localhost:8000`.

```bash
npm install
npm run dev
```

Open http://localhost:5173.

To use a different backend URL, copy `.env.example` to `.env` and update:

```env
VITE_API_URL=http://localhost:8000
```

Never put model credentials or private API keys in frontend environment variables.

## Interface workflow

1. Paste an article into the article workspace.
2. Run analysis to see the predicted category, class probabilities, and related articles.
3. Request a one-sentence, short, or detailed AI summary.
4. Search the indexed news corpus using a natural-language query.

The interface includes responsive layouts, light/dark theme support, category-specific editorial imagery, loading states, and user-facing API errors.

## Scripts

```bash
npm run dev        # local development server
npm run typecheck  # TypeScript checks
npm run build      # type-check and production build
npm run preview    # preview the production build
```

## Source map

- `src/api.ts`: typed API client and error handling.
- `src/hooks.ts`: backend health/metadata and request hooks.
- `src/components/Analyze.tsx`: article input, classification, and related results.
- `src/components/Summarize.tsx`: summary request and result presentation.
- `src/components/Search.tsx`: semantic corpus search.
- `src/components/ArticleCard.tsx`: related-article cards and category images.
- `src/App.tsx`: page composition and shared article workspace.
