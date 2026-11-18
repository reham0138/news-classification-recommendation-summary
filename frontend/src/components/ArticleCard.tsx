import type { SyntheticEvent } from "react";
import type { SimilarArticle } from "../api";
import CategoryChip from "./CategoryChip";
import { catStyle } from "../lib";

const IMAGE_ROOT = "/images/";
const PLACEHOLDER = `${IMAGE_ROOT}editorial-placeholder.svg`;

// Match specific subjects before falling back to the model's predicted category.
// These are local illustrations: no remote image requests or API keys are used.
const TOPIC_RULES: Array<{ image: string; keywords: string[] }> = [
  { image: "technology.svg", keywords: ["artificial intelligence", " ai ", "software", "cyber", "hack", "robot", "chip", "nvidia", "google", "apple", "microsoft", "tech", "digital", "semiconductor", "computer", "smartphone"] },
  { image: "business.svg", keywords: ["stock", "market", "economy", "economic", "business", "company", "companies", "bank", "finance", "financial", "trade", "investment", "investor", "shares", "inflation", "startup", "ceo", "profit"] },
  { image: "politics.svg", keywords: ["election", "president", "government", "minister", "parliament", "congress", "senate", "politic", "policy", "vote", "voting", "campaign", "white house", "prime minister"] },
  { image: "sports.svg", keywords: ["football", "soccer", "basketball", "tennis", "cricket", "olympic", "fifa", "nba", "league", "championship", "tournament", "player", "coach", "match", "goal", "team"] },
  { image: "health.svg", keywords: ["health", "hospital", "doctor", "medical", "medicine", "patient", "disease", "cancer", "virus", "vaccine", "drug", "clinical", "outbreak", "mental health"] },
  { image: "science.svg", keywords: ["science", "scientist", "research", "study", "space", "nasa", "astronomy", "discovery", "experiment", "physics", "biology", "quantum", "researcher"] },
  { image: "weather.svg", keywords: ["weather", "climate", "temperature", "storm", "forecast", "rain", "snow", "heatwave", "hurricane", "flood warning", "meteorological"] },
  { image: "environment.svg", keywords: ["environment", "environmental", "wildlife", "forest", "deforestation", "pollution", "emission", "emissions", "renewable", "solar", "wind energy", "biodiversity", "conservation", "carbon"] },
  { image: "crime.svg", keywords: ["crime", "police", "court", "lawsuit", "arrest", "murder", "fraud", "criminal", "investigation", "trial", "judge", "prison", "suspect", "prosecutor"] },
  { image: "disaster.svg", keywords: ["earthquake", "disaster", "wildfire", "tsunami", "landslide", "evacuation", "explosion", "casualties", "rescue", "emergency", "volcano"] },
  { image: "education.svg", keywords: ["education", "school", "university", "student", "teacher", "classroom", "college", "exam", "curriculum", "scholarship", "campus"] },
  { image: "arts_entertainment.svg", keywords: ["movie", "film", "music", "celebrity", "actor", "actress", "singer", "album", "concert", "festival", "entertainment", "art", "artist", "tv series"] },
  { image: "lifestyle.svg", keywords: ["lifestyle", "fashion", "food", "restaurant", "travel", "tourism", "recipe", "beauty", "wellness", "home", "culture"] },
];

const CATEGORY_IMAGES: Record<string, string> = {
  technology: "technology.svg",
  business: "business.svg",
  politics: "politics.svg",
  sports: "sports.svg",
  health: "health.svg",
  science: "science.svg",
  weather: "weather.svg",
  environment: "environment.svg",
  crime: "crime.svg",
  disaster: "disaster.svg",
  education: "education.svg",
  arts_entertainment: "arts_entertainment.svg",
  lifestyle: "lifestyle.svg",
  religion: "religion.svg",
};

function getArticleImage(article: SimilarArticle): string {
  const text = ` ${article.title} ${article.snippet} `.toLowerCase().replace(/[^a-z0-9]+/g, " ");
  const match = TOPIC_RULES.find((rule) =>
    rule.keywords.some((keyword) => text.includes(keyword.trim().toLowerCase()))
  );
  const category = article.category.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return IMAGE_ROOT + (match?.image ?? CATEGORY_IMAGES[category] ?? "editorial-placeholder.svg");
}

function useFallbackImage(event: SyntheticEvent<HTMLImageElement>) {
  const image = event.currentTarget;
  if (!image.src.endsWith(PLACEHOLDER)) image.src = PLACEHOLDER;
}

export default function ArticleCard({ a }: { a: SimilarArticle }) {
  const score = Math.max(0, Math.min(1, a.similarity));
  const image = getArticleImage(a);

  return (
    <article className="lift overflow-hidden border border-rule bg-card">
      <div className="relative h-40 overflow-hidden bg-paper">
        <img
          src={image}
          alt={`Editorial illustration for ${a.title || "news article"}`}
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
