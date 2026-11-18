import type { Meta } from "../api";

const STEPS = [
  ["Text", "Your article, stripped of HTML"],
  ["Embedding", "A vector that captures its meaning"],
  ["Classifier", "A category with probabilities"],
  ["Archive and agent", "Similar articles, or an agent that writes the summary"],
];

const Arrow = () => (
  <svg aria-hidden width="28" height="14" viewBox="0 0 28 14" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto shrink-0 rotate-90 text-muted md:rotate-0">
    <path d="M0 7h25M20 2l5 5-5 5" />
  </svg>
);

export default function Footer({ meta }: { meta: Meta | null }) {
  return (
    <footer className="rule-double mt-20 pb-12 pt-7">
      <h2 className="font-serif text-2xl font-semibold tracking-tight">Inside the newsroom</h2>
      <ol className="mt-5 flex flex-col items-stretch gap-2 md:flex-row md:items-start">
        {STEPS.flatMap(([title, body], i) => [
          i > 0 && <li key={`a${i}`} aria-hidden className="flex items-center justify-center md:pt-1"><Arrow /></li>,
          <li key={title} className="flex-1 border border-rule bg-card p-3">
            <p className="font-semibold"><span className="mr-2 text-accent">{i + 1}</span>{title}</p>
            <p className="mt-1 text-sm text-muted">{body}</p>
          </li>,
        ])}
      </ol>
      <p className="mt-6 break-words text-sm text-muted">
        {meta
          ? <>Classifier: {meta.algorithm}. Embeddings: {meta.embedding_model}. Trained {new Date(meta.trained_at).toLocaleDateString("en", { dateStyle: "medium" })}.</>
          : "Model details load when the API is online."}
      </p>
    </footer>
  );
}
