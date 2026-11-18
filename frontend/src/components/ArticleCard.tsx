import type { SyntheticEvent } from "react";
import type { SimilarArticle } from "../api";
import CategoryChip from "./CategoryChip";
import { catStyle } from "../lib";

// One stable editorial photo per category. Images are served by Unsplash;
// no API key, search request, or per-article image matching is involved.
const CATEGORY_IMAGES: Record<string, string> = {
  crime: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=900&q=80",
  lifestyle: "https://images.unsplash.com/photo-1511988617509-a57c8a288659?auto=format&fit=crop&w=900&q=80",
  disaster: "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=900&q=80",
  religion: "https://images.unsplash.com/photo-1609599006353-e629aaabfeae?auto=format&fit=crop&w=900&q=80",
  weather: "https://images.unsplash.com/photo-1534088568595-a066f410bcda?auto=format&fit=crop&w=900&q=80",
  sports: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=900&q=80",
  environment: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=900&q=80",
  health: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=900&q=80",
  science: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=900&q=80",
  business: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=900&q=80",
  technology: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=80",
  education: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=900&q=80",
  politics: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?auto=format&fit=crop&w=900&q=80",
  arts_entertainment: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=900&q=80",
};

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=900&q=80";

function getCategoryImage(category: string): string {
  const key = category.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return CATEGORY_IMAGES[key] ?? FALLBACK_IMAGE;
}

function useFallbackImage(event: SyntheticEvent<HTMLImageElement>) {
  const image = event.currentTarget;
  if (!image.dataset.fallback) {
    image.dataset.fallback = "true";
    image.src = FALLBACK_IMAGE;
  }
}

export default function ArticleCard({ a }: { a: SimilarArticle }) {
  const score = Math.max(0, Math.min(1, a.similarity));

  return (
    <article className="lift overflow-hidden border border-rule bg-card">
      <div className="relative h-40 overflow-hidden bg-paper">
        <img
          src={getCategoryImage(a.category)}
          alt={`${a.category} news`}
          loading="lazy"
          onError={useFallbackImage}
          className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
        />
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
