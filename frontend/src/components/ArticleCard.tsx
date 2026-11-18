import type { SimilarArticle } from "../api";
import CategoryChip from "./CategoryChip";
import { catStyle } from "../lib";

const EDITORIAL_IMAGES = [
  "photo-1504711434969-e33886168f5c",
  "photo-1529107386315-e1a2ed48a620",
  "photo-1451187580459-43490279c0fa",
  "photo-1516321318423-f06f85e504b3",
  "photo-1470225620780-dba8ba36b745",
];

export default function ArticleCard({ a }: { a: SimilarArticle }) {
  const score = Math.max(0, Math.min(1, a.similarity));
  const image = EDITORIAL_IMAGES[Math.abs(a.id) % EDITORIAL_IMAGES.length];
  return (
    <article className="lift overflow-hidden border border-rule bg-card">
      <div className="relative h-40 overflow-hidden bg-paper">
        <img src={`https://images.unsplash.com/${image}?auto=format&fit=crop&w=900&q=80`} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#11182c]/45 to-transparent" />
        <span className="absolute bottom-3 left-4"><CategoryChip category={a.category} /></span>
      </div>
      <div className="flex flex-col gap-3 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted">RELATED REPORT</span>
          <span className="flex items-center gap-2 text-xs tabular-nums text-muted" title="Cosine similarity">
            <span className="relative block h-1.5 w-12 overflow-hidden rounded-full bg-rule"><span className="absolute inset-y-0 left-0 rounded-full" style={{ ...catStyle(a.category), width: `${score * 100}%`, background: "hsl(var(--h) 60% 50%)" }} /></span>
            {a.similarity.toFixed(2)}
          </span>
        </div>
        <h4 className="font-serif text-xl font-bold leading-snug tracking-tight">{a.title || "Untitled article"}</h4>
        <p className="line-clamp-3 text-sm leading-relaxed text-muted">{a.snippet}</p>
      </div>
    </article>
  );
}

export function CardGrid({ items }: { items: SimilarArticle[] }) {
  return <div className="grid gap-5 sm:grid-cols-2">{items.map((a) => <ArticleCard key={a.id} a={a} />)}</div>;
}
