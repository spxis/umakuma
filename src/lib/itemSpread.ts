export type ItemSpreadRow = {
  radical: number;
  kanji: number;
  vocabulary: number;
  total: number;
};

export type ItemSpread = {
  apprentice: ItemSpreadRow;
  guru: ItemSpreadRow;
  master: ItemSpreadRow;
  enlightened: ItemSpreadRow;
  burned: ItemSpreadRow;
  totals: ItemSpreadRow;
};

export const EMPTY_ITEM_SPREAD: ItemSpread = {
  apprentice: { radical: 0, kanji: 0, vocabulary: 0, total: 0 },
  guru: { radical: 0, kanji: 0, vocabulary: 0, total: 0 },
  master: { radical: 0, kanji: 0, vocabulary: 0, total: 0 },
  enlightened: { radical: 0, kanji: 0, vocabulary: 0, total: 0 },
  burned: { radical: 0, kanji: 0, vocabulary: 0, total: 0 },
  totals: { radical: 0, kanji: 0, vocabulary: 0, total: 0 },
};

export function isItemSpread(value: unknown): value is ItemSpread {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  const keys: Array<keyof ItemSpread> = [
    "apprentice",
    "guru",
    "master",
    "enlightened",
    "burned",
    "totals",
  ];

  return keys.every((key) => {
    const row = record[key];
    if (!row || typeof row !== "object") {
      return false;
    }

    const typedRow = row as Record<string, unknown>;
    return (
      typeof typedRow.radical === "number" &&
      typeof typedRow.kanji === "number" &&
      typeof typedRow.vocabulary === "number" &&
      typeof typedRow.total === "number"
    );
  });
}
