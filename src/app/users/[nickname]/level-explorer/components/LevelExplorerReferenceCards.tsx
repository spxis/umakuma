import SubjectPill from "@/app/shared/SubjectPill";
import { SUBJECT_TYPES } from "@/lib/domainConstants";

import type { RelatedReference } from "../../explorerTypes";
import type {
  RelatedEntry,
  RelatedReferenceCardsProps,
  VocabularyKanjiCardsProps,
} from "./LevelExplorerReferenceCards.types";

function expandRelatedReferences(items: RelatedReference[]): RelatedEntry[] {
  return items.flatMap((item) => {
    const segments = item.label
      .split(/[、,]/)
      .map((segment) => segment.trim())
      .filter((segment) => Boolean(segment));

    if (segments.length <= 1) {
      return [
        {
          subjectId: item.subjectId,
          label: item.label,
          wkLevel: item.wkLevel ?? null,
          successRate: item.successRate,
          reading: item.reading ?? null,
          meaning: item.meaning ?? null,
        },
      ];
    }

    return segments.map((segment, index) => ({
      subjectId: item.subjectId,
      label: segment,
      wkLevel: item.wkLevel ?? null,
      successRate: item.successRate,
      reading: null,
      meaning: null,
      fallbackKey: `${item.subjectId}-${segment}-${index}`,
    }));
  });
}

/**
 * The related items of the selected one - radicals, look-alikes, vocabulary -
 * as the pill every other inline subject is.
 *
 * These were a tile of the explorer's own, with the level and success rate in
 * its corners, and it was the third chip shape on the site. The pill carries
 * both marks now; the English is held back while the explorer is hiding
 * English, since a self-test that shows the answer under the question is not
 * one.
 */
export function RelatedReferenceCards({
  items,
  showEnglish,
  subjectById,
  fallbackType,
  onJumpToRelatedSubject,
}: RelatedReferenceCardsProps) {
  if (items.length === 0) {
    return <p className="mt-2 text-foreground/60">-</p>;
  }

  const expandedItems = expandRelatedReferences(items);

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {expandedItems.map((entry, index) => {
        const linked = subjectById.get(entry.subjectId) ?? null;
        const isClickable = linked !== null || typeof entry.wkLevel === "number";
        const relationType = linked?.subjectType ?? fallbackType;
        const referenceWkLevel = entry.wkLevel ?? linked?.wkLevel ?? null;
        const referenceSuccessRate = entry.successRate ?? linked?.successRate ?? null;
        const reading = typeof entry.reading === "string" && entry.reading.trim() ? entry.reading : null;
        const meaning = showEnglish && typeof entry.meaning === "string" && entry.meaning.trim() ? entry.meaning : null;
        const key = entry.fallbackKey ?? `${entry.subjectId}-${entry.label}-${index}`;

        return (
          <SubjectPill
            key={key}
            glyph={entry.label}
            subjectType={relationType}
            reading={reading}
            meaning={meaning}
            level={referenceWkLevel}
            successRate={referenceSuccessRate}
            onClick={
              isClickable
                ? () => {
                    void onJumpToRelatedSubject(entry.subjectId, entry.wkLevel ?? linked?.wkLevel ?? null);
                  }
                : undefined
            }
          />
        );
      })}
    </div>
  );
}

export function VocabularyKanjiCards({ links, selectedSubjectId, onJumpToKanji }: VocabularyKanjiCardsProps) {
  if (links.length === 0) {
    return <p className="mt-2 text-foreground/60">-</p>;
  }

  return (
    <div className="mt-2 flex flex-wrap justify-start gap-2">
      {links.map((item) => (
        <SubjectPill
          key={`${selectedSubjectId}-${item.subjectId}`}
          glyph={item.char}
          subjectType={SUBJECT_TYPES.kanji}
          reading={item.reading}
          level={item.wkLevel}
          successRate={item.successRate}
          onClick={() => {
            void onJumpToKanji(item.subjectId, item.wkLevel);
          }}
        />
      ))}
    </div>
  );
}
