import "server-only";

import fs from "node:fs";
import path from "node:path";

export type JoyoAttribution = {
  source: string;
  authority: string;
  notification: string;
  via: string;
  viaUrl: string;
  licence: string;
  commit: string;
};

export type JoyoReadingEntry = {
  kanji: string;
  /** On-yomi, in katakana, as the table writes them. */
  on: string[];
  /** Kun-yomi, in hiragana. */
  kun: string[];
  /** Official example words, keyed by the reading they illustrate. */
  examples: Record<string, string[]>;
};

type JoyoFile = {
  attribution: JoyoAttribution;
  count: number;
  kanji: JoyoReadingEntry[];
};

const DATA_FILE = path.join(process.cwd(), "src", "data", "joyo-readings.json");

let byKanji: Map<string, JoyoReadingEntry> | null = null;
let attribution: JoyoAttribution | null = null;

function load(): Map<string, JoyoReadingEntry> {
  if (byKanji) {
    return byKanji;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(DATA_FILE, "utf8")) as JoyoFile;
    attribution = parsed.attribution;
    byKanji = new Map(parsed.kanji.map((entry) => [entry.kanji, entry]));
  } catch {
    byKanji = new Map();
  }

  return byKanji;
}

/**
 * The officially recognised readings for a character, or null when it has none.
 *
 * Only the 2,136 jōyō characters are in the table. Jinmeiyō name kanji are
 * outside it by definition, so a null here means "not a jōyō character" rather
 * than "no readings", and callers should keep whatever they already had.
 */
export function getJoyoReadings(kanji: string): JoyoReadingEntry | null {
  return load().get(kanji) ?? null;
}

/** The credit for the reading table, for surfaces that show it. */
export function joyoAttribution(): JoyoAttribution | null {
  load();
  return attribution;
}

/** How many characters the table covers; 2,136 when the data is intact. */
export function joyoReadingCount(): number {
  return load().size;
}
