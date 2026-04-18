import type { Snapshot } from "../../explorerTypes";

export function snapshotHasComponentKanjiData(snapshot: Snapshot): boolean {
  const vocabularyItems = snapshot.items.filter((item) => item.subjectType === "vocabulary");
  const kanjiItems = snapshot.items.filter((item) => item.subjectType === "kanji");

  return (
    vocabularyItems.every((item) =>
      Array.isArray(item.componentKanji) &&
      (item.componentKanji ?? []).every((related) => Object.hasOwn(related as object, "reading")),
    ) &&
    kanjiItems.every((item) =>
      (item.usedInVocabulary ?? []).every((related) => Object.hasOwn(related as object, "reading")) &&
      (item.radicals ?? []).every((related) => Object.hasOwn(related as object, "reading")) &&
      (item.visuallySimilar ?? []).every((related) => Object.hasOwn(related as object, "reading")),
    )
  );
}

export function snapshotHasJlptMetaData(snapshot: Snapshot): boolean {
  const kanjiItems = snapshot.items.filter((item) => item.subjectType === "kanji");
  if (kanjiItems.length === 0) return true;
  return kanjiItems.every((item) => Object.hasOwn(item, "jlptMeta"));
}

export function normalizeSnapshot(raw: Snapshot): Snapshot {
  return {
    ...raw,
    items: raw.items.map((item) => ({
      ...item,
      subjectType: item.subjectType ?? "kanji",
      wkLevel: item.wkLevel ?? raw.level,
      characters: item.characters ?? "?",
      meanings: item.meanings ?? [],
      readings: item.readings ?? [],
      primaryReadings: item.primaryReadings ?? [],
      radicals: item.radicals ?? [],
      visuallySimilar: item.visuallySimilar ?? [],
      usedInVocabulary: item.usedInVocabulary ?? [],
      componentKanji: item.componentKanji ?? [],
      meaningExplanation: item.meaningExplanation ?? "",
      readingExplanation: item.readingExplanation ?? "",
      jlptLevel: item.jlptLevel ?? null,
      startedAt: item.startedAt ?? null,
      passedAt: item.passedAt ?? null,
      availableAt: item.availableAt ?? null,
    })),
  };
}
