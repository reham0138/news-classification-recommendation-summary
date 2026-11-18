import { api, type AnalyzeResponse, type Meta } from "../api";
import { EXAMPLES } from "../examples";
import { useRequest } from "../hooks";
import { catStyle, countWords, MAX_CHARS, prettyCategory } from "../lib";
import { CardGrid } from "./ArticleCard";
import { Empty, ErrorNote, Skeleton } from "./Feedback";
import ProbabilityBars from "./ProbabilityBars";
import WordCounter from "./WordCounter";

export const DEFAULT_LIMITS = { min: 20, recommended: 200 };

export default function Analyze({ text, setText, meta }: { text: string; setText: (t: string) => void; meta: Meta | null }) {
  const { state, run, busy } = useRequest<AnalyzeResponse>("analyze");
  const min = meta?.min_words ?? DEFAULT_LIMITS.min;
  const recommended = meta?.recommended_words ?? DEFAULT_LIMITS.recommended;
  const words = countWords(text);
  const r = state.data;

  return (
    <div>
      <label htmlFor="article" className="mb-2 block font-medium">Article text</label>
      <textarea id="article" value={text} onChange={(e) => setText(e.target.value)} maxLength={MAX_CHARS} rows={10}
        placeholder="Paste the full text of a news article here…"
        className="w-full resize-y rounded-sm border border-rule bg-card p-5 font-serif text-base leading-relaxed placeholder:text-muted focus:border-accent" />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <WordCounter words={words} min={min} recommended={recommended} />
        {text.length >= MAX_CHARS && <p role="alert" className="text-sm text-bad">Limit reached: text beyond {MAX_CHARS.toLocaleString("en")} characters is cut off.</p>}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" disabled={busy || words < min}
          onClick={() => run((s) => api.analyze({ text, top_k_categories: 5, top_k_similar: 5 }, s))}
          className="rounded-sm bg-accent px-6 py-3 text-sm font-semibold text-onaccent hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45">
          {busy ? "Analyzing…" : "Analyze"}
        </button>
        <span className="text-sm text-muted">Try an example:</span>
        {EXAMPLES.map((ex) => (
          <button key={ex.id} type="button" onClick={() => setText(ex.text)} disabled={busy}
            className="rounded-sm border border-rule px-3 py-1.5 text-sm text-muted hover:border-accent hover:text-accent disabled:opacity-45">{ex.label}</button>
        ))}
      </div>

      <div aria-live="polite" className="mt-8">
        {state.status === "idle" && <Empty>Results appear here: the predicted category with probabilities, plus similar articles from the archive.</Empty>}
        {state.status === "loading" && <Skeleton label="Analyzing the article" rows={3} />}
        {state.status === "error" && <ErrorNote message={state.error!} />}
        {r && (
          <div className="space-y-8">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <div style={catStyle(r.top_category)}>
                <div className="stamp" data-unsure={!r.confident} role="img" aria-label={`Predicted category: ${prettyCategory(r.top_category)}`}>
                  <span className="text-xs">Filed under</span>
                  <span className="font-serif text-2xl font-bold leading-tight">{prettyCategory(r.top_category)}</span>
                </div>
              </div>
              {!r.confident && (
                <span title={meta ? `Top probability is below ${Math.round(meta.confidence_threshold * 100)}%` : undefined}
                  className="border border-warn px-2.5 py-1 text-sm font-medium text-warn">Low confidence: treat as a best guess</span>
              )}
            </div>
            {r.warnings.map((w) => (
              <p key={w} className="border-l-4 border-warn bg-card px-4 py-3 text-sm"><strong className="text-warn">Heads up. </strong>{w}</p>
            ))}
            <ProbabilityBars key={r.predictions.map((p) => p.probability).join()} predictions={r.predictions} />
            <div>
              <h3 className="mb-3 font-serif text-xl font-semibold">Similar articles in the archive</h3>
              {r.similar.length ? <CardGrid items={r.similar} /> : <Empty>No similar articles found.</Empty>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
