/**
 * What version the curriculum is on, and what moves it.
 *
 * The site's release number answers "what code is running". This answers a
 * different question that matters more to a learner: has what I am being
 * taught changed, and how much. A member who comes back after a month to find
 * three new kanji in a level they had finished deserves to be told, and told
 * in a way that distinguishes "we fixed a typo" from "we moved the ladder".
 *
 * Classified by diffing a freshly built ladder against the committed one:
 *
 * - a kanji added, moved or removed  -> **major**, because it changes where
 *   somebody stands; levels are gated on kanji and nothing else
 * - radicals or vocabulary only      -> **minor**; the work changes, the
 *   levels do not
 * - text only                        -> **patch**
 *
 * Starts at 1.0.0. John asked for the third number specifically so a wording
 * fix is not dressed up as a curriculum change.
 */

export const CURRICULUM_VERSION_START = "1.0.0";

export type CurriculumBump = "major" | "minor" | "patch" | "none";

export type LadderShape = {
  /** character -> level */
  kanji: Record<string, number>;
  radicals: Record<string, number>;
  /** WaniKani subject id -> level */
  vocabulary: Record<string, number>;
};

export type CurriculumDiff = {
  kanji: { added: string[]; moved: string[]; removed: string[] };
  radicals: { added: number; moved: number; removed: number };
  vocabulary: { added: number; moved: number; removed: number };
};

function diffMap(before: Record<string, number>, after: Record<string, number>) {
  const added: string[] = [];
  const moved: string[] = [];
  const removed: string[] = [];
  for (const [key, level] of Object.entries(after)) {
    if (!(key in before)) added.push(key);
    else if (before[key] !== level) moved.push(key);
  }
  for (const key of Object.keys(before)) if (!(key in after)) removed.push(key);
  return { added, moved, removed };
}

export function diffCurriculum(before: LadderShape, after: LadderShape): CurriculumDiff {
  const kanji = diffMap(before.kanji, after.kanji);
  const radicals = diffMap(before.radicals, after.radicals);
  const vocabulary = diffMap(before.vocabulary, after.vocabulary);
  return {
    kanji,
    radicals: { added: radicals.added.length, moved: radicals.moved.length, removed: radicals.removed.length },
    vocabulary: {
      added: vocabulary.added.length,
      moved: vocabulary.moved.length,
      removed: vocabulary.removed.length,
    },
  };
}

/**
 * Which number moves.
 *
 * Any kanji change at all is major, deliberately: a member's level is derived
 * from the kanji of each level and nothing else, so a single kanji moving is
 * the one kind of change that can alter where somebody stands.
 */
export function classifyCurriculumBump(diff: CurriculumDiff): CurriculumBump {
  const kanjiTouched = diff.kanji.added.length + diff.kanji.moved.length + diff.kanji.removed.length;
  if (kanjiTouched > 0) return "major";
  const restTouched =
    diff.radicals.added + diff.radicals.moved + diff.radicals.removed +
    diff.vocabulary.added + diff.vocabulary.moved + diff.vocabulary.removed;
  if (restTouched > 0) return "minor";
  return "none";
}

export function bumpCurriculumVersion(current: string, bump: CurriculumBump): string {
  const [major = 1, minor = 0, patch = 0] = current.split(".").map(Number);
  if (bump === "major") return `${major + 1}.0.0`;
  if (bump === "minor") return `${major}.${minor + 1}.0`;
  if (bump === "patch") return `${major}.${minor}.${patch + 1}`;
  return current;
}

/** One line a member can read, rather than three counts they cannot. */
export function describeCurriculumDiff(diff: CurriculumDiff): string {
  const parts: string[] = [];
  const kanji = diff.kanji;
  if (kanji.added.length) parts.push(`${kanji.added.length} kanji added`);
  if (kanji.moved.length) parts.push(`${kanji.moved.length} kanji moved`);
  if (kanji.removed.length) parts.push(`${kanji.removed.length} kanji removed`);
  const radicals = diff.radicals.added + diff.radicals.moved + diff.radicals.removed;
  if (radicals) parts.push(`${radicals} radicals changed`);
  const words = diff.vocabulary.added + diff.vocabulary.moved + diff.vocabulary.removed;
  if (words) parts.push(`${words} words changed`);
  return parts.length > 0 ? parts.join(", ") : "no change to what is taught";
}
