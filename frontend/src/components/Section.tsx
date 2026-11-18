import type { ReactNode } from "react";

/** Editorial layout: a narrow left column for the title, content on the right. */
export default function Section({ id, title, intro, children }: { id: string; title: string; intro: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="rule-double mt-16 scroll-mt-6 pt-6">
      <div className="grid gap-6 md:grid-cols-[13rem_minmax(0,1fr)] md:gap-10">
        <header>
          <h2 id={`${id}-h`} className="font-serif text-3xl font-semibold leading-tight">{title}</h2>
          <p className="mt-2 max-w-xs text-sm text-muted">{intro}</p>
        </header>
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}
