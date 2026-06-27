type Props = {
  label: string;
  cardCount?: number;
  className?: string;
  showLabel?: boolean;
  showFilterRow?: boolean;
};

export default function ExplorerLoadingShimmer({
  label,
  cardCount = 8,
  className,
  showLabel = true,
  showFilterRow = true,
}: Props) {
  return (
    <div className={`rounded-2xl border border-line bg-surface-muted p-4 ${className ?? ""}`}>
      {showFilterRow ? (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="shimmer-surface h-7 w-16 rounded-full border border-line/70" />
          <span className="shimmer-surface h-7 w-20 rounded-full border border-line/70" />
          <span className="shimmer-surface h-7 w-18 rounded-full border border-line/70" />
        </div>
      ) : null}
      <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(230px,1fr))] lg:grid-cols-4">
        {Array.from({ length: cardCount }, (_, index) => (
          <div key={`explorer-skeleton-${index}`} className="rounded-2xl border border-line/80 bg-surface p-3">
            <div className="mb-3 flex items-center justify-between">
              <span className="shimmer-surface h-3 w-8 rounded" />
              <span className="shimmer-surface h-6 w-22 rounded-full border border-line/60" />
            </div>
            <div className="shimmer-surface mb-2 h-28 rounded-xl border border-line/60" />
            <div className="shimmer-surface h-4 w-2/3 rounded" />
          </div>
        ))}
      </div>
      {showLabel ? (
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.08em] text-foreground/65">{label}</p>
      ) : null}
    </div>
  );
}