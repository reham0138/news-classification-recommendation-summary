import type { Meta } from "../api";
import type { Conn } from "../hooks";
import { API_URL } from "../api";
import { fixed } from "../lib";
import StatusChip from "./StatusChip";
import ThemeToggle from "./ThemeToggle";

function Stat({ label, value }: { label: string; value?: string }) {
  return <div className="min-w-0 py-3 md:px-5 md:first:pl-0"><dt className="text-[10px] font-bold uppercase tracking-[.15em] text-muted">{label}</dt><dd className="mt-1 font-serif text-xl font-bold sm:text-2xl">{value ?? <span className="inline-block h-6 w-20 animate-pulse rounded bg-rule/70" />}</dd></div>;
}

export default function Hero({ conn, meta }: { conn: Conn; meta: Meta | null }) {
  const today = new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(new Date());
  return (
    <header className="pt-3 sm:pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3 py-2 text-xs text-muted">
        <span className="font-semibold">{today} <span className="mx-2 opacity-40">/</span> THE DAILY SIGNAL</span>
        <div className="flex items-center gap-3"><StatusChip conn={conn} /><ThemeToggle /></div>
      </div>
      <div className="editorial-hero">
        <div className="hero-eyebrow"><span className="live-dot" /> YOUR AI-POWERED NEWSROOM</div>
        <h1 className="hero-title">See the story.<br /><span className="text-[#aaa7ff]">Find the signal.</span></h1>
        <p className="hero-copy">A sharper way to understand the news. Classify stories, uncover related coverage, and turn long reads into clear briefings.</p>
        <nav aria-label="Main navigation" className="hero-nav"><a href="#article">Article workspace ↘</a><a href="#search">Explore archive ↘</a></nav>
      </div>
      {conn === "offline" && <p role="alert" className="mb-5 rounded-xl border border-bad bg-card px-4 py-3 text-sm">Can’t reach the API at <b>{API_URL}</b>. Start the backend first. This page keeps retrying.</p>}
      <dl className="grid grid-cols-2 divide-x divide-rule rounded-2xl border border-rule bg-card px-4 md:grid-cols-4">
        <Stat label="Embedding model" value={meta?.embedding_model} /><Stat label="Categories" value={meta?.categories.length.toString()} /><Stat label="Articles indexed" value={meta?.corpus_size.toLocaleString("en")} /><Stat label="Test F1 · macro" value={meta ? fixed(meta.metrics.test_f1_macro) : undefined} />
      </dl>
    </header>
  );
}
