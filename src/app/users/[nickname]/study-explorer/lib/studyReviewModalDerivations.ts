import { toHiragana, toKatakana } from "wanakana";

import type { RelatedReference } from "../../explorerTypes";
import type { ReviewOutcome, StudyQueueItem } from "./studyExplorerTypes";
import { STUDY_REVIEW_OUTCOMES } from "./studyExplorerDomain";

export function countReviewOutcomes(
  reviewOutcomeByAssignmentId: Record<number, ReviewOutcome>,
): { correct: number; wrong: number; skipped: number } {
  let correct = 0;
  let skipped = 0;
  let wrong = 0;

  for (const [assignmentIdRaw, outcome] of Object.entries(reviewOutcomeByAssignmentId)) {
    const assignmentId = Number(assignmentIdRaw);
    if (!Number.isInteger(assignmentId) || assignmentId <= 0) {
      continue;
    }

    if (outcome === STUDY_REVIEW_OUTCOMES.correct) correct += 1;
    else if (outcome === STUDY_REVIEW_OUTCOMES.wrong) wrong += 1;
    else if (outcome === STUDY_REVIEW_OUTCOMES.skipped) skipped += 1;
  }

  return { correct, wrong, skipped };
}

export function buildStudyReviewAllMeanings(selectedItem: StudyQueueItem): string[] {
  const seen = new Set<string>();
  const deduped: string[] = [];
  const values = [
    ...selectedItem.meanings,
    ...(selectedItem.jlptMeta?.meanings ?? []),
    ...(selectedItem.jlptMeta?.primaryMeaning ? [selectedItem.jlptMeta.primaryMeaning] : []),
  ];

  for (const rawValue of values) {
    const cleaned = rawValue.replace(/\s+/g, " ").trim();
    if (cleaned.length === 0) {
      continue;
    }

    // Dedupe cross-source meaning variants while keeping display text from the first source.
    const normalized = cleaned.toLocaleLowerCase();
    if (seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    deduped.push(cleaned);
  }

  return deduped;
}

export function deriveStudyReviewReadings(selectedItem: StudyQueueItem): {
  primaryReadingHiragana: string;
  primaryReadingKatakana: string;
  secondaryReadingValue: string;
} {
  const primaryReadings = selectedItem.primaryReadings ?? [];
  const secondaryReadings = (selectedItem.readings ?? []).filter(
    (reading) => !primaryReadings.includes(reading),
  );

  const jlptOnReadings = selectedItem.jlptMeta?.onReadings ?? [];
  const jlptKunReadings = selectedItem.jlptMeta?.kunReadings ?? [];

  const primaryReadingHiraganaCandidate =
    primaryReadings.find((reading) => reading.trim().length > 0) ??
    (jlptOnReadings[0] ? toHiragana(jlptOnReadings[0]) : null);

  const matchedPrimaryOn =
    primaryReadingHiraganaCandidate
      ? (jlptOnReadings.find((reading) => toHiragana(reading) === primaryReadingHiraganaCandidate) ??
        toKatakana(primaryReadingHiraganaCandidate))
      : null;

  const primaryReadingHiragana = primaryReadingHiraganaCandidate ?? "-";
  const primaryReadingKatakana = matchedPrimaryOn ?? "-";
  const remainingOnReadings = jlptOnReadings.filter((reading) => reading !== matchedPrimaryOn);
  const secondaryReadingParts = Array.from(
    new Set(
      [
        ...remainingOnReadings,
        ...jlptKunReadings,
        ...(jlptOnReadings.length === 0 && jlptKunReadings.length === 0 ? secondaryReadings : []),
      ].filter((reading) => reading.trim().length > 0),
    ),
  );

  return {
    primaryReadingHiragana,
    primaryReadingKatakana,
    secondaryReadingValue: secondaryReadingParts.length > 0 ? secondaryReadingParts.join(", ") : "-",
  };
}

export function collectUsedKanjiItems(selectedItem: StudyQueueItem): RelatedReference[] {
  return (
    (selectedItem.componentKanji as RelatedReference[] | undefined)?.filter(
      (item) => item.label.trim().length > 0 && item.label.trim() !== "-",
    ) ?? []
  );
}

export function deriveJlptGradeLabel(selectedItem: StudyQueueItem): string {
  return typeof selectedItem.jlptMeta?.schoolGrade === "number"
    ? `Grade ${selectedItem.jlptMeta.schoolGrade}`
    : "-";
}
