import { STUDY_PANEL_TEXT } from "./StudyExplorer.constants";
import ExplorerLoadingShimmer from "../../shared/ExplorerLoadingShimmer";

type Props = {
  show: boolean;
  loadingSkeletonCardCount: number;
  showFilterPagingState: boolean;
};

export default function StudyLoadingShimmerOverlay({
  show,
  loadingSkeletonCardCount,
  showFilterPagingState,
}: Props) {
  return (
    <div
      aria-hidden={!show}
      className={`absolute inset-0 z-10 rounded-2xl border border-line bg-surface/70 backdrop-blur-[1px] transition-opacity duration-200 ${show ? "opacity-100" : "pointer-events-none opacity-0"}`}
    >
      <ExplorerLoadingShimmer
        label={showFilterPagingState ? STUDY_PANEL_TEXT.loadingSelectedLevel : STUDY_PANEL_TEXT.loadingQueue}
        cardCount={loadingSkeletonCardCount}
        className="h-full rounded-none border-0 bg-transparent p-4 sm:p-5"
        showLabel={false}
      />
      <p className="sr-only">{showFilterPagingState ? STUDY_PANEL_TEXT.loadingSelectedLevel : STUDY_PANEL_TEXT.loadingQueue}</p>
    </div>
  );
}