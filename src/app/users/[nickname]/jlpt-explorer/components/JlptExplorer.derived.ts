import type { JlptItem, UserKanjiItem } from "../../explorerTypes";

export type JlptSummary = {
  total: number;
  nLevelCounts: { n1: number; n2: number; n3: number; n4: number; n5: number };
  wkLevelCounts: Record<string, number>;
  gradeCounts: Record<string, number>;
};

type Args = {
  effectiveItems: JlptItem[];
  userKanjiByChar: Map<string, UserKanjiItem>;
  remoteSummary: JlptSummary | null;
};

export function buildJlptDerivedData({ effectiveItems, userKanjiByChar, remoteSummary }: Args) {
  const noneCountFromSummary = Number(remoteSummary?.wkLevelCounts.none ?? 0);
  const noneCount = remoteSummary
    ? noneCountFromSummary
    : effectiveItems.filter((item) => !userKanjiByChar.has(item.kanji)).length;
  const allCount = remoteSummary?.total ?? effectiveItems.length;

  const counts = {
    all: allCount,
    kanji: allCount - noneCount,
    none: noneCount,
    n5: remoteSummary?.nLevelCounts.n5 ?? effectiveItems.filter((item) => item.nLevel === 5).length,
    n4: remoteSummary?.nLevelCounts.n4 ?? effectiveItems.filter((item) => item.nLevel === 4).length,
    n3: remoteSummary?.nLevelCounts.n3 ?? effectiveItems.filter((item) => item.nLevel === 3).length,
    n2: remoteSummary?.nLevelCounts.n2 ?? effectiveItems.filter((item) => item.nLevel === 2).length,
    n1: remoteSummary?.nLevelCounts.n1 ?? effectiveItems.filter((item) => item.nLevel === 1).length,
  };

  let availableWkLevels: number[];
  let wkLevelCounts: Map<number | "none", number>;
  if (remoteSummary) {
    availableWkLevels = Object.keys(remoteSummary.wkLevelCounts)
      .map((key) => Number(key))
      .filter((level) => Number.isFinite(level))
      .sort((a, b) => a - b);
    wkLevelCounts = new Map<number | "none", number>();
    for (const [key, value] of Object.entries(remoteSummary.wkLevelCounts)) {
      wkLevelCounts.set(key === "none" ? "none" : Number(key), value);
    }
  } else {
    const levels = new Set<number>();
    wkLevelCounts = new Map<number | "none", number>();
    for (const item of effectiveItems) {
      const wkLevel = userKanjiByChar.get(item.kanji)?.wkLevel;
      if (typeof wkLevel === "number") levels.add(wkLevel);
      const wkLevelKey = typeof wkLevel === "number" ? wkLevel : "none";
      wkLevelCounts.set(wkLevelKey, (wkLevelCounts.get(wkLevelKey) ?? 0) + 1);
    }
    availableWkLevels = Array.from(levels).sort((a, b) => a - b);
  }

  let availableGrades: number[];
  let gradeCounts: Map<number | "none", number>;
  if (remoteSummary) {
    gradeCounts = new Map<number | "none", number>();
    for (const [key, value] of Object.entries(remoteSummary.gradeCounts)) {
      gradeCounts.set(key === "none" ? "none" : Number(key), value);
    }
    availableGrades = [...gradeCounts.keys()]
      .filter((k): k is number => typeof k === "number")
      .sort((a, b) => a - b);
  } else {
    gradeCounts = new Map<number | "none", number>();
    let noneGradeCount = 0;
    for (const item of effectiveItems) {
      if (item.schoolGrade == null) noneGradeCount += 1;
      else gradeCounts.set(item.schoolGrade, (gradeCounts.get(item.schoolGrade) ?? 0) + 1);
    }
    if (noneGradeCount > 0) gradeCounts.set("none", noneGradeCount);
    availableGrades = [...gradeCounts.keys()]
      .filter((k): k is number => typeof k === "number")
      .sort((a, b) => a - b);
  }

  return { counts, availableWkLevels, wkLevelCounts, availableGrades, gradeCounts };
}
