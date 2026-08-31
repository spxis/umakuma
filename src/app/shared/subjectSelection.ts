/**
 * Choosing items, as a thing any subject surface can do.
 *
 * The tempting shape was "build a practice sheet from this grade", written
 * into the practice page. That would have been the feature and none of the
 * capability: selecting a set of characters is useful for a sheet today and
 * for a quiz, a saved list or a printout tomorrow, and every one of those
 * would have re-implemented the picking.
 *
 * So this is deliberately not "make a sheet". It is "choose these", and what
 * can be done with a chosen set is offered afterwards, by whoever has a
 * destination worth offering. The surface says which items exist and what
 * their keys are; it does not need to know where they end up.
 *
 * Keys are the kanji characters themselves rather than subject ids. Grades
 * come from a local catalogue keyed by character, the explorers list WaniKani
 * subjects, and the practice sheet looks up stroke data by character - the
 * character is the one identifier all three share, and it survives a URL.
 */

export const SUBJECT_SELECTION_COPY = {
  start: "Choose",
  cancel: "Cancel",
  clear: "Clear",
  selectAll: "All on this page",
  chosenSuffix: "chosen",
  /* A verb here, so Canadian spelling takes the s: you practise a sheet. */
  practise: "Practise these",
  emptyHint: "Pick the characters you want, then choose what to do with them.",
  /* Said where it is useful, not in a help page nobody opens. */
  rangeHint: "Shift-click a second one to take everything between.",
  limitReached: "That is as many as one selection holds.",
} as const;

/**
 * The keys a shift-click sweeps up, in the order they are on screen.
 *
 * Both ends included, and either direction: sweeping right to left is the same
 * range as left to right, which is what makes the gesture work without anyone
 * thinking about which card they clicked first.
 *
 * An anchor that is no longer on screen - a new grade, a new page of results -
 * gives an empty range rather than a wrong one, and the caller falls back to
 * treating the click as an ordinary one.
 */
export function selectionRange(
  anchor: string | null,
  key: string,
  order: readonly string[],
): string[] {
  const from = anchor === null ? -1 : order.indexOf(anchor);
  const to = order.indexOf(key);
  if (from < 0 || to < 0) {
    return [];
  }

  const [start, end] = from <= to ? [from, to] : [to, from];
  return order.slice(start, end + 1);
}

/**
 * A cap, because the selection travels in a URL.
 *
 * Two hundred single characters is about 600 bytes encoded - comfortable
 * everywhere - and is far more than a practice sheet anybody prints. The limit
 * exists so a runaway "select all" cannot build a link a browser refuses.
 */
export const SUBJECT_SELECTION_LIMIT = 200;

/** The query parameter a chosen set travels in. */
export const SELECTION_PARAM = "picked";

/**
 * Joined without a separator: these are single characters, so the string is
 * its own list and stays readable in the address bar.
 */
export function encodeSelection(keys: Iterable<string>): string {
  return [...keys].join("");
}

export function decodeSelection(raw: string | null | undefined): string[] {
  if (!raw) return [];

  /*
   * Split by code point rather than by index. A handful of kanji outside the
   * Basic Multilingual Plane - 𠮟 among them - are two UTF-16 units, and
   * splitting on `""` would tear them into unusable halves.
   */
  const seen = new Set<string>();
  for (const character of Array.from(raw)) {
    if (seen.size >= SUBJECT_SELECTION_LIMIT) break;
    if (character.trim()) seen.add(character);
  }
  return [...seen];
}
