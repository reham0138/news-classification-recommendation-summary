import type { ReactNode } from "react";

export function ErrorNote({ message }: { message: string }) {
  return (
    <p role="alert" className="border-l-4 border-bad bg-card px-4 py-3 text-sm text-ink">
      <strong className="font-semibold text-bad">That didn’t work. </strong>
      {message}
    </p>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="border border-dashed border-rule px-4 py-6 text-sm text-muted">{children}</p>;
}

export function Skeleton({ rows = 3, label }: { rows?: number; label: string }) {
  return (
    <div role="status" aria-label={label} className="space-y-3">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-16 animate-pulse bg-rule/50" style={{ opacity: 1 - i * 0.18 }} />
      ))}
    </div>
  );
}
