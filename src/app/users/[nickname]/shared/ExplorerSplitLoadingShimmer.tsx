import ExplorerLoadingShimmer from "./ExplorerLoadingShimmer";

type Props = {
  label: string;
  cardCount?: number;
  className?: string;
};

export default function ExplorerSplitLoadingShimmer({
  label,
  cardCount = 8,
  className,
}: Props) {
  return (
    <div className={`space-y-3 ${className ?? ""}`}>
      <div className="rounded-2xl border border-line/80 bg-surface px-3 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="shimmer-surface h-3 w-34 rounded" />
          <div className="flex items-center gap-2">
            <span className="shimmer-surface h-7 w-14 rounded-full border border-line/70" />
            <span className="shimmer-surface h-7 w-14 rounded-full border border-line/70" />
            <span className="shimmer-surface h-7 w-14 rounded-full border border-line/70" />
          </div>
        </div>
      </div>
      <ExplorerLoadingShimmer
        label={label}
        cardCount={cardCount}
        showFilterRow={false}
      />
    </div>
  );
}