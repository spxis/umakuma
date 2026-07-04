import type { RelatedReference } from "../../explorerTypes";
import { pronunciationForReading } from "../lib/levelExplorerDisplay";
import { SUBJECT_TYPES } from "@/lib/domainConstants";
import GlyphReferenceTile from "../../shared/GlyphReferenceTile";
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
          reading: item.reading ?? null,
          meaning: item.meaning ?? null,
        },
      ];
    }

    return segments.map((segment, index) => ({
      subjectId: item.subjectId,
      label: segment,
      wkLevel: item.wkLevel ?? null,
      reading: null,
      meaning: null,
      fallbackKey: `${item.subjectId}-${segment}-${index}`,
    }));
  });
}

export function RelatedReferenceCards({
  items,
  large,
  showEnglish,
  subjectById,
  fallbackType,
  onJumpToRelatedSubject,
}: RelatedReferenceCardsProps) {
  if (items.length === 0) {
    return <p className="mt-2 text-foreground/60">-</p>;
  }

  const size = large ? "large" : "normal";
  const expandedItems = expandRelatedReferences(items);

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {expandedItems.map((entry, index) => {
        const linked = subjectById.get(entry.subjectId) ?? null;
        const isClickable = linked !== null || typeof entry.wkLevel === "number";
        const relationType = linked?.subjectType ?? fallbackType;
        const referenceWkLevel = entry.wkLevel ?? linked?.wkLevel ?? null;
        const reading = typeof entry.reading === "string" && entry.reading.trim() ? entry.reading : null;
        const meaning = typeof entry.meaning === "string" && entry.meaning.trim() ? entry.meaning : null;
        const subtitle = (() => {
          if (reading) {
            if (!showEnglish) return reading;

            const pronunciation = pronunciationForReading(reading);
            return pronunciation ? `${reading} / ${pronunciation}` : reading;
          }

          return meaning;
        })();
        const key = entry.fallbackKey ?? `${entry.subjectId}-${entry.label}-${index}`;

        if (!isClickable) {
          return (
            <GlyphReferenceTile
              key={key}
              glyph={entry.label}
              subtitle={subtitle}
              subjectType={relationType}
              wkLevel={referenceWkLevel}
              size={size}
            />
          );
        }

        return (
          <GlyphReferenceTile
            key={key}
            glyph={entry.label}
            subtitle={subtitle}
            subjectType={relationType}
            wkLevel={referenceWkLevel}
            size={size}
            onClick={() => {
              void onJumpToRelatedSubject(entry.subjectId, entry.wkLevel ?? linked?.wkLevel ?? null);
            }}
          />
        );
      })}
    </div>
  );
}

export function VocabularyKanjiCards({
  links,
  showEnglish,
  selectedSubjectId,
  onJumpToKanji,
}: VocabularyKanjiCardsProps) {
  if (links.length === 0) {
    return <p className="mt-2 text-foreground/60">-</p>;
  }

  return (
    <div className="mt-2 flex flex-wrap justify-start gap-2">
      {links.map((item) => {
        const subtitle = (() => {
          if (!showEnglish) return item.reading;
          const pronunciation = pronunciationForReading(item.reading);
          return pronunciation ? `${item.reading} / ${pronunciation}` : item.reading;
        })();

        return (
          <GlyphReferenceTile
            key={`${selectedSubjectId}-${item.subjectId}`}
            glyph={item.char}
            subtitle={subtitle}
            subjectType={SUBJECT_TYPES.kanji}
            wkLevel={item.wkLevel}
            size="large"
            onClick={() => {
              void onJumpToKanji(item.subjectId, item.wkLevel);
            }}
          />
        );
      })}
    </div>
  );
}
