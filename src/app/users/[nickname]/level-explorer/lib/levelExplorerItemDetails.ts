import type { LevelItem } from "../../explorerTypes";
import {
  isVocabularySubjectType,
  LEVEL_SUBJECT_TYPES,
} from "./levelExplorerDomain";

export type VocabularyKanjiLink = {
  char: string;
  subjectId: number;
  reading: string;
  wkLevel: number | null;
};

export function buildSubjectById(items: LevelItem[]): Map<number, LevelItem> {
  return new Map(items.map((item) => [item.subjectId, item]));
}

export function buildKanjiByCharacter(items: LevelItem[]): Map<string, LevelItem> {
  return new Map(
    items
      .filter((item) => item.subjectType === LEVEL_SUBJECT_TYPES.kanji)
      .map((item) => [item.characters, item]),
  );
}

export function buildVocabularyKanjiLinks(
  selectedItem: LevelItem | null,
  subjectById: Map<number, LevelItem>,
  kanjiByCharacter: Map<string, LevelItem>,
): VocabularyKanjiLink[] {
  if (!selectedItem || !isVocabularySubjectType(selectedItem.subjectType)) {
    return [];
  }

  const componentLinks = (selectedItem.componentKanji ?? [])
    .map((component) => {
      const found = subjectById.get(component.subjectId);
      return {
        char: component.label,
        subjectId: component.subjectId,
        reading:
          typeof component.reading === "string" && component.reading.length > 0
            ? component.reading
            : found
              ? (found.primaryReadings ?? [])[0] ?? "-"
              : "-",
        wkLevel:
          typeof component.wkLevel === "number"
            ? component.wkLevel
            : typeof found?.wkLevel === "number"
              ? found.wkLevel
              : null,
      };
    })
    .filter((item) => Boolean(item.char));

  if (componentLinks.length > 0) {
    return componentLinks;
  }

  return Array.from(selectedItem.characters)
    .map((char) => {
      const found = kanjiByCharacter.get(char);
      if (!found) {
        return null;
      }

      return {
        char,
        subjectId: found.subjectId,
        reading: (found.primaryReadings ?? [])[0] ?? "-",
        wkLevel: typeof found.wkLevel === "number" ? found.wkLevel : null,
      };
    })
    .filter((value): value is VocabularyKanjiLink => value !== null);
}
