import { STUDY_PANEL_TEXT } from "./StudyExplorer.constants";
import ExplorerLoadingShimmer from "../../shared/ExplorerLoadingShimmer";

type Props = {
  show: boolean;
  loadingSkeletonCardCount: number;
  showFilterPagingState: boolean;
  filtersOpen: boolean;
};

export default function StudyLoadingShimmerOverlay({
  show,
  loadingSkeletonCardCount,
  showFilterPagingState,
  filtersOpen,
}: Props) {
  return (
    <div
      aria-hidden={!show}
      className={`absolute inset-0 z-10 rounded-2xl border border-line bg-surface/70 backdrop-blur-[1px] transition-opacity duration-200 ${show ? "opacity-100" : "pointer-events-none opacity-0"}`}
    >
      <div className="h-full space-y-3 p-4 sm:p-5">
        <div className="rounded-2xl border border-line/80 bg-surface px-3 py-3">
          {filtersOpen ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="shimmer-surface h-3 w-34 rounded" />
                <span className="shimmer-surface h-7 w-22 rounded-full border border-line/70" />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="shimmer-surface h-7 w-24 rounded-full border border-line/70" />
                <span className="shimmer-surface h-7 w-24 rounded-full border border-line/70" />
                <span className="shimmer-surface h-7 w-24 rounded-full border border-line/70" />
                <span className="shimmer-surface h-7 w-32 rounded-full border border-line/70" />
              </div>
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_16rem]">
                <span className="shimmer-surface h-7 rounded-full border border-line/70" />
                <span className="shimmer-surface h-7 rounded-full border border-line/70" />
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="shimmer-surface h-3 w-26 rounded" />
              <span className="shimmer-surface h-7 w-28 rounded-full border border-line/70" />
            </div>
          )}
        </div>
        <ExplorerLoadingShimmer
          label={showFilterPagingState ? STUDY_PANEL_TEXT.loadingSelectedLevel : STUDY_PANEL_TEXT.loadingQueue}
          cardCount={loadingSkeletonCardCount}
          className="h-full min-h-0"
          showLabel={false}
          showFilterRow={false}
        />
      </div>
      <p className="sr-only">{showFilterPagingState ? STUDY_PANEL_TEXT.loadingSelectedLevel : STUDY_PANEL_TEXT.loadingQueue}</p>
    </div>
  );
}