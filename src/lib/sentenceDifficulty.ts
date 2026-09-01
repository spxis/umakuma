/**
 * How hard an example sentence is to read, so the easiest one leads.
 *
 * A character like 水 appears in thousands of Tatoeba sentences, and showing
 * whichever one the database returned first hands a first-grader a sentence
 * built from jinmeiyō kanji. Difficulty is scored once at ingest and stored, so
 * the query is a plain sort and the reasoning lives here rather than in SQL.
 *
 * Two things make a sentence hard: how long it is, and the hardest character
 * in it. Length is the honest baseline - a short sentence is readable even when
 * every word is new - and the hardest kanji dominates, because one unknown
 * character stops a learner as surely as ten do.
 */

/** What a character costs, given what the dictionary knows about it. */
export type KanjiDifficultySource = {
  grade: number | null;
  frequencyRank: number | null;
};

/** A character nobody has graded and nobody counts as frequent. */
const UNKNOWN_COST = 20;
/** The hardest kanji weighs this much more than a character of length. */
const HARDEST_WEIGHT = 3;

/**
 * The cost of one character.
 *
 * School grades are the scale a family already understands, so grades 1-6 cost
 * their own number. Grade 8 is the rest of jōyō - taught in secondary school -
 * and 9 and 10 are the name kanji, which a learner meets late if at all.
 * Ungraded characters fall back to how common they are, since a frequent
 * character is easier than a rare one whatever any curriculum says.
 */
export function kanjiCost(entry: KanjiDifficultySource | null | undefined): number {
  if (!entry) return UNKNOWN_COST;
  if (entry.grade !== null && entry.grade <= 6) return entry.grade;
  if (entry.grade === 8) return 9;
  if (entry.grade !== null) return 14;
  if (entry.frequencyRank !== null) return Math.min(18, 10 + Math.round(entry.frequencyRank / 400));
  return UNKNOWN_COST;
}

/** Every kanji in the text, once each, in the order they appear. */
export function kanjiIn(text: string): string[] {
  const seen = new Set<string>();
  for (const character of text) {
    if (/[一-鿿㐀-䶿]/.test(character)) seen.add(character);
  }
  return [...seen];
}

/**
 * The sentence's score, lowest first.
 *
 * Kana-only sentences score their length alone, which puts them at the top
 * where they belong: a beginner can read every one of them.
 */
export function sentenceDifficulty(text: string, costs: Map<string, number>): number {
  const characters = kanjiIn(text);
  const hardest = characters.reduce(
    (worst, character) => Math.max(worst, costs.get(character) ?? UNKNOWN_COST),
    0,
  );
  return [...text].length + hardest * HARDEST_WEIGHT;
}
