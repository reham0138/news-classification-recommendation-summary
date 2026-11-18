import { useState } from "react";
import { api, type Meta, type SummarizeResponse, type SummaryLength } from "../api";
import { useRequest } from "../hooks";
import { countWords, friendlyStop } from "../lib";
import { DEFAULT_LIMITS } from "./Analyze";
import { CardGrid } from "./ArticleCard";
import CategoryChip from "./CategoryChip";
import { Empty, ErrorNote } from "./Feedback";
import Progress from "./Progress";

const LENGTHS: { id: SummaryLength; label: string }[] = [
  { id: "one_sentence", label: "One line" }, { id: "short", label: "Brief" }, { id: "detailed", label: "In depth" },
];

export default function Summarize({ text, meta }: { text: string; meta: Meta | null }) {
  const [length, setLength] = useState<SummaryLength>("short");
  const { state, run, busy } = useRequest<SummarizeResponse>("summarize");
  const min = meta?.min_words ?? DEFAULT_LIMITS.min;
  const words = countWords(text);
  const r = state.data;

  return <div>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted">Create an AI-written briefing from the article above · {words.toLocaleString("en")} words</p>
      <fieldset disabled={busy} className="flex rounded-full border border-rule bg-paper p-1">
        <legend className="sr-only">Summary length</legend>
        {LENGTHS.map((l) => <label key={l.id} className={`cursor-pointer rounded-full px-3 py-2 text-xs font-bold transition-colors ${length === l.id ? "bg-ink text-paper shadow" : "text-muted hover:text-ink"}`}><input type="radio" name="length" className="sr-only" checked={length === l.id} onChange={() => setLength(l.id)} />{l.label}</label>)}
      </fieldset>
    </div>
    <button type="button" disabled={busy || words < min} onClick={() => run((s) => api.summarize({ text, length }, s))}
      className="mt-4 rounded-full border border-accent bg-transparent px-6 py-3 text-sm font-bold text-accent hover:bg-accent hover:text-onaccent disabled:cursor-not-allowed disabled:opacity-40">
      {busy ? "Preparing your briefing…" : "✧ Generate summary"}
    </button>
    {words < min && <p className="mt-2 text-xs text-muted">Add at least {min} words to enable this action.</p>}
    <div aria-live="polite" className="mt-8">
      {state.status === "idle" && <Empty>Your concise briefing will appear here.</Empty>}
      {state.status === "loading" && <Progress />}
      {state.status === "error" && <ErrorNote message={state.error!} />}
      {r && <div className="space-y-8">
        {!r.complete && <p className="rounded-xl border border-warn/40 bg-card px-4 py-3 text-sm"><strong className="text-warn">Draft: </strong>The AI stopped before saving a final version ({friendlyStop(r.stop_reason)}). Review the wording before relying on it.</p>}
        <div>
          {r.category && <p className="mb-3 flex items-center gap-2 text-sm text-muted"><CategoryChip category={r.category} />{r.category_confident === false && "Low confidence"}</p>}
          <h3 className="font-serif text-3xl font-bold leading-tight sm:text-4xl">{r.headline}</h3>
          <p className="mt-4 max-w-prose text-lg leading-relaxed">{r.summary}</p>
        </div>
        {r.key_points.length > 0 && <div><h3 className="font-serif text-xl font-bold">The key takeaways</h3><ul className="mt-3 max-w-prose space-y-3">{r.key_points.map((k) => <li key={k} className="flex gap-3"><span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent" /><span>{k}</span></li>)}</ul></div>}
        {r.related.length > 0 && <div><h3 className="mb-3 font-serif text-xl font-bold">More to explore</h3><CardGrid items={r.related} /></div>}
      </div>}
    </div>
  </div>;
}
