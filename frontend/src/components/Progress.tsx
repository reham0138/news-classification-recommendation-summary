export default function Progress() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center gap-4 rounded-2xl border border-rule bg-card px-5 py-9 text-center">
      <div className="wait-orbit" aria-hidden="true" />
      <div><p className="font-serif text-xl font-bold">Putting the story together</p><p className="mt-1 text-sm text-muted">The newsroom is reading your article and preparing the result.</p></div>
      <div className="press w-full max-w-xs" aria-hidden="true" />
      <div className="wait-dots" aria-hidden="true"><span /><span /><span /></div>
      <span className="sr-only">Please wait while the request is processed.</span>
    </div>
  );
}
