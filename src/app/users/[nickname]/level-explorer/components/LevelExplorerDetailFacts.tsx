import type { LevelItem } from "../../explorerTypes";
import {
  ReadingListWithPronunciation,
  formatDate,
  formatRelativeFromNow,
  secondaryReadingsForDisplay,
} from "../lib/levelExplorerDisplay";
import { isRadicalSubjectType } from "../lib/levelExplorerDomain";

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
          <div className="rounded-xl border border-line bg-surface-muted p-3 text-sm">
            <p className="text-xs font-bold uppercase text-foreground/70">Primary reading</p>
            <p className="mt-1 text-lg font-semibold text-foreground/90 sm:text-xl">
              {isRadicalSubjectType(selectedItem.subjectType) ? (
                "Not applicable"
              ) : (
                <ReadingListWithPronunciation readings={selectedItem.primaryReadings ?? []} mode={showEnglishForReadings ? "inline" : "plain"} />
              )}
            </p>
          </div>
          <div className="rounded-xl border border-line bg-surface-muted p-3 text-sm">
            <p className="text-xs font-bold uppercase text-foreground/70">Secondary readings</p>
            <p className="mt-1 text-lg font-semibold text-foreground/90 sm:text-xl">
              {isRadicalSubjectType(selectedItem.subjectType) ? (
                "Not applicable"
              ) : (
                <ReadingListWithPronunciation readings={secondaryReadingsForDisplay(selectedItem)} mode={showEnglishForReadings ? "inline" : "plain"} />
              )}
            </p>
          </div>
        </div>
      ) : null}

      {!hideTimeStats ? (
        <div className={`${canShowReadings ? "mt-3" : "mt-4"} grid gap-3 sm:grid-cols-2 lg:grid-cols-3`}>
          <div className="rounded-xl border border-line bg-surface-muted p-3 text-sm">
            <p className="text-xs font-bold uppercase text-foreground/70">Started</p>
            <p className="mt-1 font-semibold text-foreground/90">
              {formatDate(selectedItem.startedAt)}
              {formatRelativeFromNow(selectedItem.startedAt) ? ` (${formatRelativeFromNow(selectedItem.startedAt)})` : ""}
            </p>
          </div>
          <div className="rounded-xl border border-line bg-surface-muted p-3 text-sm">
            <p className="text-xs font-bold uppercase text-foreground/70">Next review</p>
            <p className="mt-1 font-semibold text-foreground/90">{formatDate(selectedItem.availableAt)}</p>
          </div>
          <div className="rounded-xl border border-line bg-surface-muted p-3 text-sm">
            <p className="text-xs font-bold uppercase text-foreground/70">Passed</p>
            <p className="mt-1 font-semibold text-foreground/90">
              {formatDate(selectedItem.passedAt)}
              {formatRelativeFromNow(selectedItem.passedAt) ? ` (${formatRelativeFromNow(selectedItem.passedAt)})` : ""}
            </p>
          </div>
        </div>
      ) : null}

      {!studyMode || revealStudyReading ? (
        <div className={`mt-4 grid gap-3 ${showReadingExplanation ? "lg:grid-cols-2" : "lg:grid-cols-1"}`}>
          <article className="rounded-xl border border-line bg-surface-muted p-3 text-sm">
            <p className="text-xs font-bold uppercase text-foreground/70">Meaning explanation</p>
            <p className="mt-2 text-foreground/90">{selectedMeaningExplanation}</p>
          </article>
          {showReadingExplanation ? (
            <article className="rounded-xl border border-line bg-surface-muted p-3 text-sm">
              <p className="text-xs font-bold uppercase text-foreground/70">Reading explanation</p>
              <p className="mt-2 text-foreground/90">{selectedReadingExplanationRaw}</p>
            </article>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
