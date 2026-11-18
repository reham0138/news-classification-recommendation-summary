import type { Meta } from "../api";
import type { Conn } from "../hooks";
import { API_URL } from "../api";
import { fixed } from "../lib";
import StatusChip from "./StatusChip";
import ThemeToggle from "./ThemeToggle";

function Stat({ label, value }: { label: string; value?: string }) {
  return (
    <div className="border-rule px-4 py-3 odd:pl-0 md:border-l md:odd:pl-4 md:first:border-l-0 md:first:pl-0">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1 break-words font-serif text-xl font-semibold leading-tight sm:text-2xl">
        {value ?? <span aria-label="loading" className="inline-block h-6 w-20 animate-pulse bg-rule/60 align-middle" />}
      </dd>
    </div>
  );
}

export default function Hero({ conn, meta }: { conn: Conn; meta: Meta | null }) {
  const today = new Intl.DateTimeFormat("en", { dateStyle: "full" }).format(new Date());
  return (
    <header className="pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule pb-3 text-sm text-muted">
        <span>{today}</span>
        <div className="flex items-center gap-3"><StatusChip conn={conn} /><ThemeToggle /></div>
      </div>
      <h1 className="mt-8 font-serif text-[clamp(3rem,11vw,7rem)] font-bold leading-[0.92] tracking-tight">News Intelligence</h1>
      <p className="mt-5 max-w-xl text-balance font-serif text-xl leading-snug text-muted sm:text-2xl">
        Paste a news article. See which desk it belongs on, which archive stories it resembles, and what an AI agent makes of it.
      </p>
      {conn === "offline" && (
        <p role="alert" className="mt-6 max-w-2xl border-l-4 border-bad bg-card px-4 py-3 text-sm">
          Can’t reach the API at <b>{API_URL}</b>. Start the backend first (<code>uvicorn app.main:app --port 8000</code>). The first start loads a 1.3 GB model, so it can take up to 30 seconds. This page keeps retrying.
        </p>
      )}
      <dl className="mt-10 grid grid-cols-2 border-y border-ink md:grid-cols-4">
        <Stat label="Embedding model" value={meta?.embedding_model} />
        <Stat label="Categories" value={meta?.categories.length.toString()} />
        <Stat label="Articles in the archive" value={meta?.corpus_size.toLocaleString("en")} />
        <Stat label="Test F1 (macro)" value={meta ? fixed(meta.metrics.test_f1_macro) : undefined} />
      </dl>
    </header>
  );
}
