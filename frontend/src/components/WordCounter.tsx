export default function WordCounter({ words, min, recommended }: { words: number; min: number; recommended: number }) {
  const [tone, hint] =
    words >= recommended ? ["text-ok", "Good length"]
    : words >= min ? ["text-warn", `${recommended}+ words gives more reliable results`]
    : ["text-bad", `Needs at least ${min} words`];
  return (
    <p className={`text-sm font-medium tabular-nums ${tone}`}>
      <span aria-hidden className="mr-2 inline-block h-2 w-2 rounded-full bg-current" />
      {words.toLocaleString("en")} {words === 1 ? "word" : "words"}
      <span className="font-normal text-muted"> — {hint}</span>
    </p>
  );
}
