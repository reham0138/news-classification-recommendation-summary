import type { ReactNode } from "react";

const INDEX: Record<string, string> = {
  analyze: "01 / Editorial desk",
  summarize: "02 / The briefing",
  search: "03 / From the archive",
};

/** Editorial layout: section identity on the left, working area on the right. */
export default function Section({ id, title, intro, children }: { id: string; title: string; intro: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="rule-double mt-14 scroll-mt-6 pt-6 sm:mt-20 sm:pt-8">
      <div className="grid gap-6 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-12">
        <header className="md:sticky md:top-6 md:self-start">
          <p className="mb-3 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-accent">{INDEX[id] ?? "News desk"}</p>
          <h2 id={`${id}-h`} className="font-serif text-3xl font-semibold leading-[1.08] tracking-tight sm:text-4xl">{title}</h2>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">{intro}</p>
        </header>
        <div className="min-w-0 border-t border-rule pt-5 md:border-l md:border-t-0 md:pl-8 md:pt-0">{children}</div>
      </div>
    </section>
  );
}
