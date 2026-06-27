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
            <div className="space-y-2.5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center justify-between gap-2">
                  <span className="shimmer-surface h-3 w-12 rounded" />
                  <span className="shimmer-surface h-7 w-20 rounded-full border border-line/70" />
                </div>
                <div className="flex w-full items-center gap-2 sm:w-1/2">
                  <span className="shimmer-surface h-7 flex-1 rounded-full border border-line/70" />
                  <span className="shimmer-surface h-7 w-18 rounded-full border border-line/70" />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="shimmer-surface h-3 w-10 rounded" />
                  <span className="shimmer-surface h-7 w-14 rounded-full border border-line/70" />
                  <span className="shimmer-surface h-7 w-14 rounded-full border border-line/70" />
                  <span className="shimmer-surface h-7 w-14 rounded-full border border-line/70" />
                  <span className="shimmer-surface h-7 w-14 rounded-full border border-line/70" />
                  <span className="shimmer-surface hidden h-7 w-14 rounded-full border border-line/70 sm:inline-flex" />
                  <span className="shimmer-surface hidden h-7 w-14 rounded-full border border-line/70 sm:inline-flex" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="shimmer-surface h-3 w-14 rounded" />
                  <span className="shimmer-surface h-7 w-16 rounded-full border border-line/70" />
                  <span className="shimmer-surface h-7 w-16 rounded-full border border-line/70" />
                  <span className="shimmer-surface h-7 w-16 rounded-full border border-line/70" />
                  <span className="shimmer-surface h-7 w-16 rounded-full border border-line/70" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="shimmer-surface h-3 w-10 rounded" />
                  <span className="shimmer-surface h-7 w-16 rounded-full border border-line/70" />
                  <span className="shimmer-surface h-7 w-16 rounded-full border border-line/70" />
                  <span className="shimmer-surface h-7 w-16 rounded-full border border-line/70" />
                </div>
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