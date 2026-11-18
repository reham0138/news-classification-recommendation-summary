import { useEffect, useState } from "react";
import type { Prediction } from "../api";
import { catStyle, pct, prettyCategory } from "../lib";

/** Bars grow from 0 on mount; remount (via `key`) to replay for a new result. */
export default function ProbabilityBars({ predictions }: { predictions: Prediction[] }) {
  const [shown, setShown] = useState(false);
  useEffect(() => { const id = requestAnimationFrame(() => setShown(true)); return () => cancelAnimationFrame(id); }, []);
  return (
    <ul className="space-y-3">
      {predictions.map((p, i) => (
        <li key={p.label} style={catStyle(p.label)}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className={i === 0 ? "font-semibold" : "text-muted"}>{prettyCategory(p.label)}</span>
            <span className={`tabular-nums ${i === 0 ? "font-semibold" : "text-muted"}`}>{pct(p.probability)}</span>
          </div>
          <div className="mt-1 h-3 bg-rule/60" aria-hidden>
            <div className="bar-fill h-full" style={{
              width: shown ? `${Math.max(p.probability * 100, 0.5)}%` : "0%",
              transitionDelay: `${i * 90}ms`,
              background: "hsl(var(--h) 62% 48%)",
              opacity: i === 0 ? 1 : 0.5,
            }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
