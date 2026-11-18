import type { SimilarArticle } from "../api";
import CategoryChip from "./CategoryChip";
import { catStyle } from "../lib";

export default function ArticleCard({ a }: { a: SimilarArticle }) {
  const score = Math.max(0, Math.min(1, a.similarity));
  return (
    <article className="lift flex flex-col gap-3 border border-rule bg-card p-5 sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <CategoryChip category={a.category} />
        <span className="flex items-center gap-2 text-xs tabular-nums text-muted" title="Cosine similarity">
          <span className="sr-only">Similarity</span>
          <span aria-hidden className="relative block h-1.5 w-12 bg-rule">
            <span className="cat absolute inset-y-0 left-0 border-0" style={{ ...catStyle(a.category), width: `${score * 100}%`, background: "hsl(var(--h) 60% 50%)" }} />
          </span>
          {a.similarity.toFixed(2)}
        </span>
      </div>
      <h4 className="font-serif text-xl font-semibold leading-snug tracking-tight">{a.title || "Untitled article"}</h4>
      <p className="line-clamp-3 text-sm text-muted">{a.snippet}</p>
    </article>
  );
}

export function CardGrid({ items }: { items: SimilarArticle[] }) {
  return <div className="grid gap-4 sm:grid-cols-2">{items.map((a) => <ArticleCard key={a.id} a={a} />)}</div>;
}
