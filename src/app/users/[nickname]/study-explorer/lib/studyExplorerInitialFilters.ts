import type {
  StudySrsFilter,
  StudySrsStageFilter,
  StudyTypeFilter,
} from "./studyExplorerTypes";

export function readInitialFiltersFromUrl(queueMode: "review" | "lesson"): {
  viewedLevel: number | null;
  typeFilter: StudyTypeFilter;
  srsFilter: StudySrsFilter;
  srsStageFilter: StudySrsStageFilter | null;
  recentOnly: boolean;
  showLocked: boolean;
} | null {
  if (typeof window === "undefined") {
    return null;
  }

  const params = new URLSearchParams(window.location.search);

  const rawLevel = Number(params.get("level"));
  const viewedLevel = Number.isInteger(rawLevel) && rawLevel > 0 ? rawLevel : null;

  const rawType = params.get("type");
  const typeFilter: StudyTypeFilter =
    rawType === "radical" || rawType === "kanji" || rawType === "vocabulary" ? rawType : "all";

  const rawSrs = params.get("srs");
  const srsFilter: StudySrsFilter =
    rawSrs === "locked"
    || rawSrs === "apprentice"
    || rawSrs === "guru"
    || rawSrs === "master"
    || rawSrs === "enlightened"
    || rawSrs === "burned"
      ? rawSrs
      : "all";

  const rawSrsStage = Number(params.get("srsStage"));
  const srsStageFilter = Number.isInteger(rawSrsStage) && rawSrsStage >= 1 && rawSrsStage <= 9
    ? (rawSrsStage as StudySrsStageFilter)
    : null;

  return {
    viewedLevel,
    typeFilter,
    srsFilter: queueMode === "lesson" ? "all" : srsFilter,
    srsStageFilter: queueMode === "lesson" ? null : srsStageFilter,
    recentOnly: queueMode === "lesson" ? false : params.get("recent") === "1",
    showLocked: queueMode === "lesson" ? true : params.get("hideLocked") !== "1",
  };
}