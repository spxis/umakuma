export default function Loading() {
  return (
    <div
      className="relative min-h-screen overflow-hidden pb-12"
      role="status"
      aria-label="Loading UmaKuma"
    >
      <div className="noise-overlay pointer-events-none absolute inset-0" />
      <main className="relative w-full animate-pulse px-4 pt-4 sm:px-6 lg:px-8">
        <div className="mb-2 flex h-11 items-center justify-between">
          <div className="h-8 w-28 rounded-full bg-surface-muted" />
          <div className="h-8 w-20 rounded-full bg-surface-muted" />
        </div>
        <div className="mb-3 h-28 rounded-2xl bg-surface-muted sm:h-36" />
        <section className="rounded-2xl border border-line/80 bg-surface/85 p-5 shadow-[0_24px_80px_rgba(15,111,255,0.17)] sm:p-8">
          <div className="h-4 w-36 rounded bg-surface-muted" />
          <div className="mt-4 h-14 w-64 max-w-full rounded bg-surface-muted" />
          <div className="mt-4 h-5 w-full max-w-2xl rounded bg-surface-muted" />
          <div className="mt-6 grid gap-3 sm:grid-cols-3 sm:gap-4">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="h-28 rounded-2xl border border-line bg-surface-muted"
              />
            ))}
          </div>
        </section>
        <div className="mt-6 h-56 rounded-2xl border border-line bg-surface-muted" />
        <div className="mt-6 h-80 rounded-2xl border border-line bg-surface-muted" />
      </main>
    </div>
  );
}
