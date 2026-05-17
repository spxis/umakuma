import type { StudySrsFilter, StudySrsStageFilter } from "./studyExplorerTypes";
import { STUDY_SRS_FILTERS } from "./studyExplorerDomain";

export function normalizeSrsStageFilter(
  nextFilter: StudySrsFilter,
  currentStage: StudySrsStageFilter | null,
): StudySrsStageFilter | null {
  if (currentStage === null) {
    return null;
  }

  if (nextFilter === STUDY_SRS_FILTERS.all) {
    return currentStage;
  }

  if (nextFilter === STUDY_SRS_FILTERS.apprentice && currentStage >= 1 && currentStage <= 4) return currentStage;
  if (nextFilter === STUDY_SRS_FILTERS.guru && currentStage >= 5 && currentStage <= 6) return currentStage;
  if (nextFilter === STUDY_SRS_FILTERS.master && currentStage === 7) return currentStage;
  if (nextFilter === STUDY_SRS_FILTERS.enlightened && currentStage === 8) return currentStage;
  if (nextFilter === STUDY_SRS_FILTERS.burned && currentStage === 9) return currentStage;

  return null;
}
