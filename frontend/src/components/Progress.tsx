import { useEffect, useState } from "react";

// The agent picks its own steps; this shows the usual order so the wait feels alive.
const STAGES: [string, string][] = [
  ["Look", "Reading the opening lines"],
  ["Look", "Classifying the article"],
  ["Look", "Checking the archive for related stories"],
  ["Act", "Pulling out the key facts"],
  ["Act", "Writing the headline and summary"],
  ["Act", "Saving the result"],
];

export default function Progress() {
  const [secs, setSecs] = useState(0);
  useEffect(() => { const id = setInterval(() => setSecs((s) => s + 1), 1000); return () => clearInterval(id); }, []);
  const active = Math.min(Math.floor(secs / 5), STAGES.length - 1);
  return (
    <div role="status" className="border border-rule bg-card p-5">
      <p className="font-serif text-xl font-semibold">The agent is working on it</p>
      <p className="mt-1 text-sm text-muted">This usually takes 10 to 40 seconds. Please keep this page open.</p>
      <div className="press mt-4" aria-hidden />
      <ol className="mt-4 space-y-1.5 text-sm" aria-hidden>
        {STAGES.map(([kind, label], i) => (
          <li key={label} className={`flex items-center gap-3 ${i < active ? "text-muted line-through" : i === active ? "font-medium" : "text-muted/70"}`}>
            <span className={`h-2.5 w-2.5 ${kind === "Look" ? "rounded-full border-2 border-accent" : "bg-accent"} ${i === active ? "blink" : ""}`} />
            {label}
          </li>
        ))}
      </ol>
      <p className="mt-4 text-xs tabular-nums text-muted" aria-hidden>{secs} s elapsed. The agent chooses its own steps, so this order is typical, not exact.</p>
    </div>
  );
}
