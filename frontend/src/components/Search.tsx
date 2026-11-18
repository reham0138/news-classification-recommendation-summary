import { useState, type FormEvent } from "react";
import { api, type Meta, type SearchResponse } from "../api";
import { useRequest } from "../hooks";
import { catStyle, prettyCategory } from "../lib";
import { CardGrid } from "./ArticleCard";
import { Empty, ErrorNote, Skeleton } from "./Feedback";

const SUGGESTIONS = ["interest rate decision", "wildfire evacuation", "new vaccine trial"];

export default function Search({ meta }: { meta: Meta | null }) {
  const [query, setQuery] = useState("");
  const [asked, setAsked] = useState(""); // the query the visible results belong to
  const [category, setCategory] = useState<string | null>(null);
  const { state, run, busy } = useRequest<SearchResponse>("search");

  const go = (q: string, cat: string | null) => {
    const clean = q.trim();
    if (clean.length < 2) return;
    setAsked(clean);
    run((s) => api.search({ query: clean, top_k: 8, ...(cat ? { category: cat } : {}) }, s));
  };
  const pick = (cat: string | null) => { setCategory(cat); if (asked) go(asked, cat); };
  const submit = (e: FormEvent) => { e.preventDefault(); go(query, category); };
  const results = state.data?.results;

  return (
    <div>
      <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="q" className="sr-only">Search the archive</label>
        <input id="q" type="search" value={query} onChange={(e) => setQuery(e.target.value)} maxLength={500}
          placeholder="Describe a topic, e.g. “central bank raises rates”"
          className="min-w-0 flex-1 rounded-sm border border-rule bg-card px-4 py-3 focus:border-accent" />
        <button type="submit" disabled={busy || query.trim().length < 2}
          className="rounded-sm bg-accent px-6 py-3 text-sm font-semibold text-onaccent hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45">
          {busy ? "Searching…" : "Search"}
        </button>
      </form>

      <div role="group" aria-label="Filter by category" className="mt-4 flex flex-wrap gap-2">
        {[null, ...(meta?.categories ?? [])].map((c) => {
          const on = c === category;
          return (
            <button key={c ?? "all"} type="button" aria-pressed={on} onClick={() => pick(c)} style={c ? catStyle(c) : undefined}
              className={`border px-2.5 py-1 text-sm ${on ? (c ? "cat font-semibold" : "border-ink bg-ink text-paper") : "border-rule text-muted hover:border-ink hover:text-ink"}`}>
              {c ? prettyCategory(c) : "All categories"}
            </button>
          );
        })}
      </div>

      <div aria-live="polite" className="mt-8">
        {state.status === "idle" && (
          <Empty>
            Search by meaning, not exact words. Try:{" "}
            {SUGGESTIONS.map((s, i) => (
              <span key={s}>{i > 0 && ", "}
                <button type="button" className="underline decoration-accent underline-offset-4 hover:text-ink" onClick={() => { setQuery(s); go(s, category); }}>{s}</button>
              </span>
            ))}
          </Empty>
        )}
        {state.status === "loading" && <Skeleton label="Searching the archive" rows={3} />}
        {state.status === "error" && <ErrorNote message={state.error!} />}
        {results && (results.length === 0
          ? <Empty>No matches for “{asked}”{category ? ` in ${prettyCategory(category)}` : ""}. Try different words or clear the category filter.</Empty>
          : <>
              <p className="mb-3 text-sm text-muted">{results.length} {results.length === 1 ? "result" : "results"} for “{asked}”{category ? ` in ${prettyCategory(category)}` : ""}</p>
              <CardGrid items={results} />
            </>)}
      </div>
    </div>
  );
}
