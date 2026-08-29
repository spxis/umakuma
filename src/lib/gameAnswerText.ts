import { toRomaji } from "wanakana";

import {
  GAME_DIRECTIONS,
  type GameAnswerMode,
  type GameAnswerType,
  type GameDirection,
} from "@/lib/gameMode";

type TextSource = {
  characters: string;
  primaryMeaning: string | null;
  primaryReading: string | null;
};

const ANSWER_TYPES = {
  meaning: "meaning" as GameAnswerType,
  reading: "reading" as GameAnswerType,
  romaji: "romaji" as GameAnswerType,
};

/**
 * The text side of a question: the meaning, the kana reading, or that reading
 * transliterated. Returns null when the item cannot answer in that form, which
 * is how unusable questions get filtered out before they are built.
 */
export function answerText(item: TextSource, answerType: GameAnswerType): string | null {
  if (answerType === ANSWER_TYPES.meaning) return item.primaryMeaning?.trim() || null;
  if (answerType === ANSWER_TYPES.reading) return item.primaryReading?.trim() || null;
  if (answerType === ANSWER_TYPES.romaji) {
    const reading = item.primaryReading?.trim();
    if (!reading) return null;
    const romaji = toRomaji(reading).trim();
    return romaji.length > 0 ? romaji : null;
  }
  return null;
}

/** What a tile displays: the glyph when finding one, the text when reading one. */
export function optionLabel(
  item: TextSource,
  direction: GameDirection,
  answerType: GameAnswerType,
): string {
  if (direction === GAME_DIRECTIONS.find) return item.characters;
  return answerText(item, answerType) ?? item.characters;
}

/** What the question asks with: the text when finding, the glyph when reading. */
export function promptText(
  item: TextSource,
  direction: GameDirection,
  answerType: GameAnswerType,
): string | null {
  return direction === GAME_DIRECTIONS.find ? answerText(item, answerType) : item.characters;
}

/**
 * Answer types a question could use, given the requested mode.
 *
 * Radicals have no reading, so they can only be answered by meaning. Romaji is
 * only offered where a kana reading exists to transliterate.
 */
export function candidateAnswerTypes(
  item: TextSource & { subjectType: string },
  mode: GameAnswerMode,
): GameAnswerType[] {
  const available: GameAnswerType[] = [];
  if (item.primaryMeaning) available.push(ANSWER_TYPES.meaning);
  if (item.subjectType !== "radical" && item.primaryReading) {
    available.push(ANSWER_TYPES.reading, ANSWER_TYPES.romaji);
  }
  if (mode === "auto") return available;
  return available.filter((type) => type === mode);
}

/**
 * True when every tile would show a different thing. Two tiles both reading
 * "Father" would make the question unanswerable, which matters far more in Read
 * mode where different glyphs often share a meaning or reading.
 */
export function labelsAreDistinct(
  items: TextSource[],
  direction: GameDirection,
  answerType: GameAnswerType,
): boolean {
  const labels = items.map((item) => optionLabel(item, direction, answerType).toLowerCase());
  return new Set(labels).size === labels.length;
}
