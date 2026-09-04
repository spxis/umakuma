/**
 * Which name a member sees for a radical.
 *
 * Two names exist for most of them and they are not interchangeable. Ours come
 * from RADKFILE and KANJIDIC — 一 is "one", 月 is "month". WaniKani's are their
 * own invention — "Ground", "Moon", "Fins", "Triceratops" — and a member who
 * spent two years learning them thinks in those words.
 *
 * So: a connected member gets theirs, with ours beside it. Everyone else gets
 * only ours, because WaniKani's radical names are their creative content, the
 * same as their mnemonics, and showing them to somebody with no WaniKani
 * account would be redistributing it.
 *
 * Where we have no name at all — 15 of the 241 are shapes the dictionary does
 * not name — a connected member still sees theirs and everybody else sees the
 * character itself. Better an honest blank than a borrowed word.
 */

export type RadicalNames = {
  /** Ours. Null where the dictionary names nothing. */
  ours: string | null;
  /** WaniKani's, or null when they do not teach this shape. */
  theirs: string | null;
};

export type RadicalNameView = {
  /** What to print. */
  primary: string;
  /** The other name, where there is one and the member may see it. */
  secondary: string | null;
  /** True when the printed name is WaniKani's rather than ours. */
  fromWanikani: boolean;
};

/**
 * A dictionary gloss is not a name.
 *
 * RADKFILE labels 冂 "upside-down box radical (no. 13)" and 儿 "legs radical
 * (no. 10)". That is the index describing its own numbering, and printing it
 * at a learner is worse than printing nothing — it reads as a name and teaches
 * a wrong one.
 */
export function isIndexGloss(name: string | null): boolean {
  if (!name) return true;
  /* Anything ending in "radical" is the index naming itself rather than
     naming the shape: "upside-down box radical", "legs radical", "katakana hi
     radical". Checked after the numbering is stripped as well as before, or
     removing "(no. 13)" turns a gloss into something that looks like a name. */
  return /\bradical\b\s*(\(no\.\s*\d+\))?\s*$/i.test(name.trim());
}

/** The usable half of our name, or null when there is not one. */
export function ourUsableName(name: string | null): string | null {
  if (!name) return null;
  const first = name
    .split(",")
    .map((part) => part.replace(/\(no\.\s*\d+\)/gi, "").trim())
    .find((part) => part.length > 0 && !isIndexGloss(part));
  return first ?? null;
}

export function radicalNameView({
  names,
  characters,
  canSeeWanikani,
}: {
  names: RadicalNames;
  characters: string;
  canSeeWanikani: boolean;
}): RadicalNameView {
  const ours = ourUsableName(names.ours);
  const theirs = canSeeWanikani ? names.theirs : null;

  if (ours) return { primary: ours, secondary: theirs, fromWanikani: false };
  if (theirs) return { primary: theirs, secondary: null, fromWanikani: true };
  return { primary: characters, secondary: null, fromWanikani: false };
}
