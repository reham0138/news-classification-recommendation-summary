// Typed client for the News Intelligence API. Types follow backend/app/schemas.py.
export const API_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

export type SummaryLength = "one_sentence" | "short" | "detailed";

export interface Health { status: "ok" | "loading" }
export interface Metrics {
  val_f1_macro?: number;
  test_f1_macro?: number;
  test_accuracy?: number;
  [key: string]: number | undefined;
}
export interface Meta {
  categories: string[];
  algorithm: string;
  embedding_model: string;
  corpus_size: number;
  confidence_threshold: number;
  min_words: number;
  recommended_words: number;
  metrics: Metrics;
  trained_at: string;
}
export interface Prediction { label: string; probability: number }
export interface SimilarArticle { id: number; title: string; snippet: string; category: string; similarity: number }
export interface AnalyzeRequest { text: string; top_k_categories?: number; top_k_similar?: number; same_category?: boolean }
export interface AnalyzeResponse {
  top_category: string;
  confident: boolean;
  predictions: Prediction[];
  warnings: string[];
  similar: SimilarArticle[];
}
export interface TraceStep { step: number; tool: string; args: Record<string, unknown>; reason: string }
export interface SummarizeResponse {
  complete: boolean;
  stop_reason: string;
  steps: number;
  tokens_used: number;
  category: string | null;
  category_confident: boolean | null;
  headline: string | null;
  summary: string | null;
  key_points: string[];
  related: SimilarArticle[];
  trace: TraceStep[];
}
export interface SearchResponse { results: SimilarArticle[] }

/** status 0 = the request never reached the server (offline, CORS, backend still starting). */
export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export const isAbort = (e: unknown) => e instanceof DOMException && e.name === "AbortError";

// FastAPI sends `detail` as a string for errors the app raises, but as a list of
// {msg, loc, ...} objects for schema validation (blank text, over-long text, short query).
async function readDetail(res: Response): Promise<string> {
  try {
    const body = await res.json();
    const d = body?.detail;
    if (typeof d === "string") return d;
    if (Array.isArray(d)) return d.map((x) => String(x?.msg ?? x).replace(/^Value error, /, "")).join(" ");
  } catch { /* not JSON */ }
  return res.statusText || `HTTP ${res.status}`;
}

async function request<T>(path: string, opts: { body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(API_URL + path, {
      method: opts.body === undefined ? "GET" : "POST",
      headers: opts.body === undefined ? undefined : { "Content-Type": "application/json" },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      signal: opts.signal,
    });
  } catch (e) {
    if (isAbort(e)) throw e;
    throw new ApiError(0, "network");
  }
  if (!res.ok) throw new ApiError(res.status, await readDetail(res));
  return (await res.json()) as T;
}

export const api = {
  health: (signal?: AbortSignal) => request<Health>("/health", { signal }),
  meta: (signal?: AbortSignal) => request<Meta>("/api/v1/meta", { signal }),
  analyze: (body: AnalyzeRequest, signal?: AbortSignal) => request<AnalyzeResponse>("/api/v1/analyze", { body, signal }),
  summarize: (body: { text: string; length: SummaryLength }, signal?: AbortSignal) =>
    request<SummarizeResponse>("/api/v1/summarize", { body, signal }),
  search: (body: { query: string; top_k?: number; category?: string }, signal?: AbortSignal) =>
    request<SearchResponse>("/api/v1/search", { body, signal }),
};

export type ErrorContext = "analyze" | "summarize" | "search";

// Server details (request ids, provider messages) are never shown on the page. They go to the console.
function agentProblem(detail: string): string {
  const d = detail.toLowerCase();
  if (d.includes("cannot reach the llm server"))
    return "The AI model isn’t responding. If you run it locally, check that Ollama is running, then try again.";
  if (d.includes("does not support tools"))
    return "The AI model chosen on the server can’t be used for summaries. Pick a different model in the server settings.";
  if (d.includes("402") || d.includes("payment") || d.includes("credit"))
    return "The AI service has no credit left, so it can’t write summaries right now.";
  if (d.includes("not found") || d.includes("does not exist"))
    return "The AI model named in the server settings wasn’t found. Check the model name.";
  return "The AI couldn’t write a summary this time. Please try again, or try a longer article.";
}

/** Plain-language message for any thrown error. */
export function friendlyError(e: unknown, ctx: ErrorContext): string {
  console.warn(`[news-intelligence] ${ctx} request failed:`, e);
  if (!(e instanceof ApiError)) return "Something unexpected went wrong. Please try again.";
  if (e.status === 0) return "Can’t reach the server. Make sure the backend is running, then try again.";
  if (e.status === 503)
    return ctx === "summarize" ? "Summaries aren’t available right now. The AI model isn’t set up on the server." : "The model is still loading. Try again in a few seconds.";
  if (e.status === 502) return agentProblem(e.message);
  if (e.status === 422) return e.message; // validation messages are written for people (e.g. "too short")
  return "The server had a problem with that request. Please try again.";
}
