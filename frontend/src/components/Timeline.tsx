import type { TraceStep } from "../api";
import { isLook } from "../lib";

const fmtArgs = (a: Record<string, unknown>) => Object.entries(a).map(([k, v]) => `${k}: ${String(v)}`);

export default function Timeline({ trace }: { trace: TraceStep[] }) {
  if (!trace.length) return null;
  return (
    <div>
      <h3 className="font-serif text-xl font-semibold">What the agent did</h3>
      <p className="mt-1 text-sm text-muted">
        <span className="mr-1 inline-block h-2.5 w-2.5 rounded-full border-2 border-accent align-baseline" /> Look: reads or measures.{" "}
        <span className="ml-2 mr-1 inline-block h-2.5 w-2.5 bg-accent align-baseline" /> Act: produces or saves something.
      </p>
      <ol className="mt-5 border-l border-ink">
        {trace.map((t, i) => {
          const look = isLook(t.tool);
          return (
            <li key={i} className="relative pb-6 pl-6 last:pb-0">
              <span aria-hidden className={`absolute -left-[7px] top-1.5 h-3.5 w-3.5 ${look ? "rounded-full border-2 border-accent bg-paper" : "bg-accent"}`} />
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-semibold">{t.tool}</span>
                <span className={`px-1.5 py-0.5 text-xs font-medium ${look ? "border border-accent text-accent" : "bg-accent text-onaccent"}`}>{look ? "Look" : "Act"}</span>
                <span className="text-xs text-muted">Step {t.step}</span>
                {fmtArgs(t.args).map((a) => <span key={a} className="border border-rule px-1.5 text-xs text-muted">{a}</span>)}
              </div>
              {t.reason && <p className="mt-1 max-w-prose font-serif italic text-muted">{t.reason}</p>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
