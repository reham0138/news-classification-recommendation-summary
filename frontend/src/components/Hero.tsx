import type { Meta } from "../api";
import type { Conn } from "../hooks";
import { API_URL } from "../api";
import { fixed } from "../lib";
import StatusChip from "./StatusChip";
import ThemeToggle from "./ThemeToggle";

function Stat({ label, value }: { label: string; value?: string }) {
  return (
    <div className="min-w-0 py-4 md:px-5 md:first:pl-0">
      <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted">{label}</dt>
      <dd className="mt-2 break-words font-serif text-xl font-semibold leading-tight sm:text-2xl">
        {value ?? <span aria-label="loading" className="inline-block h-6 w-20 animate-pulse bg-rule/60 align-middle" />}
      </dd>
    </div>
  );
}

export default function Hero({ conn, meta }: { conn: Conn; meta: Meta | null }) {
  const today = new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date());
  return (
    <header className="pt-4 sm:pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-y border-rule py-2.5 text-xs font-medium tracking-wide text-muted">
        <span>{today}</span>
        <div className="flex items-center gap-3">
          <span className="hidden uppercase tracking-[0.16em] sm:inline">Independent news intelligence</span>
          <StatusChip conn={conn} />
          <ThemeToggle />
        </div>
      </div>

      <div className="py-8 sm:py-11">
        <div className="flex items-center gap-3 text-[0.68rem] font-bold uppercase tracking-[0.22em] text-accent">
          <span className="h-px w-8 bg-accent" />
          The newsroom
        </div>
        <h1 className="mt-3 font-serif text-[clamp(3.1rem,10vw,7rem)] font-bold leading-[0.88] tracking-[-0.055em]">
          News Intelligence<span className="text-accent">.</span>
        </h1>
        <div className="mt-6 flex flex-col justify-between gap-5 border-t border-rule pt-5 md:flex-row md:items-end">
          <p className="max-w-2xl text-balance font-serif text-lg leading-relaxed text-muted sm:text-xl">
            A smarter way to read the news. Classify stories, explore the archive, and turn long articles into clear, evidence-led summaries.
          </p>
          <p className="shrink-0 text-xs font-semibold uppercase tracking-[0.16em] text-muted">Read deeper. Understand faster.</p>
        </div>
      </div>

      <nav aria-label="Main navigation" className="flex flex-wrap items-center gap-x-7 gap-y-2 border-y border-ink py-3 text-sm font-semibold">
        <a href="#analyze" className="hover:text-accent">Article analysis</a>
        <a href="#summarize" className="hover:text-accent">AI summary</a>
        <a href="#search" className="hover:text-accent">Archive search</a>
      </nav>

      {conn === "offline" && (
        <p role="alert" className="mt-5 border-l-2 border-bad bg-card px-4 py-3 text-sm">
          Can’t reach the API at <b>{API_URL}</b>. Start the backend first (<code>uvicorn app.main:app --port 8000</code>). The first start loads a 1.3 GB model, so it can take up to 30 seconds. This page keeps retrying.
        </p>
      )}
      <dl className="mt-6 grid grid-cols-2 divide-x divide-rule border-b border-rule md:grid-cols-4">
        <Stat label="Embedding model" value={meta?.embedding_model} />
        <Stat label="Categories" value={meta?.categories.length.toString()} />
        <Stat label="Articles in the archive" value={meta?.corpus_size.toLocaleString("en")} />
        <Stat label="Test F1 (macro)" value={meta ? fixed(meta.metrics.test_f1_macro) : undefined} />
      </dl>
    </header>
  );
}
