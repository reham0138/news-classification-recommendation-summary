import { useState } from "react";
import { api, type Meta, type SummarizeResponse, type SummaryLength } from "../api";
import { useRequest } from "../hooks";
import { countWords, friendlyStop } from "../lib";
import { DEFAULT_LIMITS } from "./Analyze";
import { CardGrid } from "./ArticleCard";
import CategoryChip from "./CategoryChip";
import { Empty, ErrorNote } from "./Feedback";
import Progress from "./Progress";
import Timeline from "./Timeline";

const LENGTHS: { id: SummaryLength; label: string }[] = [
  { id: "one_sentence", label: "One sentence" },
  { id: "short", label: "Short" },
  { id: "detailed", label: "Detailed" },
];

export default function Summarize({ text, meta }: { text: string; meta: Meta | null }) {
  const [length, setLength] = useState<SummaryLength>("short");
  const { state, run, busy } = useRequest<SummarizeResponse>("summarize");
  const min = meta?.min_words ?? DEFAULT_LIMITS.min;
  const words = countWords(text);
  const r = state.data;

  return (
    <div>
      <p className="text-sm text-muted">
        Uses the article from the Analyze section above ({words.toLocaleString("en")} {words === 1 ? "word" : "words"}).
        {words < min && " Add at least " + min + " words there to enable this."}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <fieldset disabled={busy} className="flex">
          <legend className="sr-only">Summary length</legend>
          {LENGTHS.map((l) => (
            <label key={l.id} className={`cursor-pointer border px-3 py-2 text-sm font-medium has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent -ml-px first:ml-0 ${length === l.id ? "z-10 border-ink bg-ink text-paper" : "border-rule hover:border-ink"}`}>
              <input type="radio" name="length" className="sr-only" checked={length === l.id} onChange={() => setLength(l.id)} />
              {l.label}
            </label>
          ))}
        </fieldset>
        <button type="button" disabled={busy || words < min} onClick={() => run((s) => api.summarize({ text, length }, s))}
          className="bg-accent px-5 py-2.5 font-semibold text-onaccent hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45">
          {busy ? "Working…" : "Summarize with agent"}
        </button>
      </div>

      <div aria-live="polite" className="mt-8">
        {state.status === "idle" && <Empty>The agent reads the article, checks its category, writes a summary and shows every step it took.</Empty>}
        {state.status === "loading" && <Progress />}
        {state.status === "error" && <ErrorNote message={state.error!} />}
        {r && (
          <div className="space-y-8">
            {!r.complete && (
              <p className="border-l-4 border-warn bg-card px-4 py-3 text-sm">
                <strong className="text-warn">Draft. </strong>The agent stopped before it saved a final version ({friendlyStop(r.stop_reason)}). Check the wording before you rely on it.
              </p>
            )}
            <div>
              {r.category && (
                <p className="mb-3 flex items-center gap-2 text-sm text-muted">
                  <CategoryChip category={r.category} />{r.category_confident === false && "low confidence"}
                </p>
              )}
              <h3 className="font-serif text-3xl font-bold leading-tight sm:text-4xl">{r.headline}</h3>
              <p className="mt-4 max-w-prose font-serif text-lg leading-relaxed">{r.summary}</p>
            </div>
            {r.key_points.length > 0 && (
              <div>
                <h3 className="font-serif text-xl font-semibold">Key points</h3>
                <ul className="mt-2 max-w-prose divide-y divide-rule border-y border-rule">
                  {r.key_points.map((k) => <li key={k} className="py-2">{k}</li>)}
                </ul>
              </div>
            )}
            {r.related.length > 0 && (
              <div><h3 className="mb-3 font-serif text-xl font-semibold">Related articles</h3><CardGrid items={r.related} /></div>
            )}
            <Timeline trace={r.trace} />
            <p className="border-t border-rule pt-3 text-sm tabular-nums text-muted">
              {r.steps} {r.steps === 1 ? "step" : "steps"}, {r.tokens_used.toLocaleString("en")} tokens, stop reason: {friendlyStop(r.stop_reason)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
