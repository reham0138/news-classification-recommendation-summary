import type { Conn } from "../hooks";

const LABEL: Record<Conn, { text: string; tip: string; dot: string }> = {
  checking: { text: "Connecting", tip: "Checking the API…", dot: "bg-muted blink" },
  online: { text: "Online", tip: "The model is loaded and ready.", dot: "bg-ok" },
  loading: { text: "Model loading", tip: "The API is up but the model is still loading.", dot: "bg-warn blink" },
  offline: { text: "Offline", tip: "Can’t reach the API. If you just started it, the model may still be loading (10–30 s).", dot: "bg-bad" },
};

export default function StatusChip({ conn }: { conn: Conn }) {
  const s = LABEL[conn];
  return (
    <span role="status" title={s.tip} className="inline-flex items-center gap-2 border border-rule px-2.5 py-1 text-xs font-medium">
      <span aria-hidden className={`h-2 w-2 rounded-full ${s.dot}`} />
      <span className="sr-only">API status: </span>{s.text}
    </span>
  );
}
