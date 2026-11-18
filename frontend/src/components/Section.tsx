import type { ReactNode } from "react";

const INDEX: Record<string, string> = { article: "01 / Start here", search: "02 / Discover" };

export default function Section({ id, title, intro, children }: { id: string; title: string; intro: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="mt-14 scroll-mt-6 pt-2 sm:mt-20">
      <div className="mb-6 flex flex-col justify-between gap-3 border-b border-rule pb-5 sm:flex-row sm:items-end">
        <div><p className="mb-2 text-[10px] font-extrabold uppercase tracking-[.18em] text-accent">{INDEX[id] ?? "News desk"}</p><h2 id={`${id}-h`} className="font-serif text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{title}</h2></div>
        <p className="max-w-sm text-sm leading-relaxed text-muted">{intro}</p>
      </div>
      {children}
    </section>
  );
}
