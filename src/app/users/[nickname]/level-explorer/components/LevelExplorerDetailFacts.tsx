import type { LevelItem } from "../../explorerTypes";
import {
  ReadingListWithPronunciation,
  formatDate,
  formatRelativeFromNow,
  secondaryReadingsForDisplay,
} from "../lib/levelExplorerDisplay";
import { isRadicalSubjectType } from "../lib/levelExplorerDomain";
import FieldLabel from "../../../../shared/FieldLabel";
import SurfaceCard from "../../../../shared/SurfaceCard";

type Props = {
  selectedItem: LevelItem;
  canShowReadings: boolean;
  showEnglishForReadings: boolean;
  hideTimeStats: boolean;
  studyMode: boolean;
  revealStudyReading: boolean;
  selectedMeaningExplanation: string;
  selectedReadingExplanationRaw: string;
  showReadingExplanation: boolean;
};

export default function LevelExplorerDetailFacts({
  selectedItem,
  canShowReadings,
  showEnglishForReadings,
  hideTimeStats,
  studyMode,
  revealStudyReading,
  selectedMeaningExplanation,
  selectedReadingExplanationRaw,
  showReadingExplanation,
}: Props) {
  return (
    <>
      {canShowReadings ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <SurfaceCard className="text-sm">
            <FieldLabel>Primary reading</FieldLabel>
            <p className="mt-1 text-lg font-semibold text-foreground/90 sm:text-xl">
              {isRadicalSubjectType(selectedItem.subjectType) ? (
                "Not applicable"
              ) : (
                <ReadingListWithPronunciation readings={selectedItem.primaryReadings ?? []} mode={showEnglishForReadings ? "inline" : "plain"} />
              )}
            </p>
          </SurfaceCard>
          <SurfaceCard className="text-sm">
            <FieldLabel>Secondary readings</FieldLabel>
            <p className="mt-1 text-lg font-semibold text-foreground/90 sm:text-xl">
              {isRadicalSubjectType(selectedItem.subjectType) ? (
                "Not applicable"
              ) : (
                <ReadingListWithPronunciation readings={secondaryReadingsForDisplay(selectedItem)} mode={showEnglishForReadings ? "inline" : "plain"} />
              )}
            </p>
          </SurfaceCard>
        </div>
      ) : null}

      {!hideTimeStats ? (
        <div className={`${canShowReadings ? "mt-3" : "mt-4"} grid gap-3 sm:grid-cols-2 lg:grid-cols-3`}>
          <SurfaceCard className="text-sm">
            <FieldLabel>Started</FieldLabel>
            <p className="mt-1 font-semibold text-foreground/90">
              {formatDate(selectedItem.startedAt)}
              {formatRelativeFromNow(selectedItem.startedAt) ? ` (${formatRelativeFromNow(selectedItem.startedAt)})` : ""}
            </p>
          </SurfaceCard>
          <SurfaceCard className="text-sm">
            <FieldLabel>Next review</FieldLabel>
            <p className="mt-1 font-semibold text-foreground/90">{formatDate(selectedItem.availableAt)}</p>
          </SurfaceCard>
          <SurfaceCard className="text-sm">
            <FieldLabel>Passed</FieldLabel>
            <p className="mt-1 font-semibold text-foreground/90">
              {formatDate(selectedItem.passedAt)}
              {formatRelativeFromNow(selectedItem.passedAt) ? ` (${formatRelativeFromNow(selectedItem.passedAt)})` : ""}
            </p>
          </SurfaceCard>
        </div>
      ) : null}

      {!studyMode || revealStudyReading ? (
        <div className={`mt-4 grid gap-3 ${showReadingExplanation ? "lg:grid-cols-2" : "lg:grid-cols-1"}`}>
          <article className="rounded-xl border border-line bg-surface-muted p-3 text-sm">
            <FieldLabel>Meaning explanation</FieldLabel>
            <p className="mt-2 text-foreground/90">{selectedMeaningExplanation}</p>
          </article>
          {showReadingExplanation ? (
            <article className="rounded-xl border border-line bg-surface-muted p-3 text-sm">
              <FieldLabel>Reading explanation</FieldLabel>
              <p className="mt-2 text-foreground/90">{selectedReadingExplanationRaw}</p>
            </article>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
