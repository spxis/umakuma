/**
 * Commands typed into the search box.
 *
 * The radical lookup began as a button beside the field that opened a dialog
 * over the page, and the two halves never agreed: the query was in one place
 * and the answer in another, a picked radical left no trace in the box, and
 * nothing about the state could be typed, copied or sent to anybody.
 *
 * A command fixes all of that at once by making the query itself the state.
 * `:radicals 刀 + 二 + 井` is what the picker edits and what the search reads,
 * so the box always says what is being asked, the back button walks it, and a
 * lookup can be pasted into a message.
 *
 * The syntax is deliberately loose about everything except the leading colon.
 * Somebody typing this by hand will separate with a plus, a comma or a space,
 * and will not think about which; the only thing they cannot mean by accident
 * is a query that starts with a colon.
 */

export const SEARCH_COMMAND_PREFIX = ":";

/** What a reader might type for the same command; the first is what we write. */
export const RADICAL_COMMAND_NAMES = ["radicals", "radical", "rad"] as const;

export type RadicalCommand = {
  kind: "radicals";
  /** The radicals chosen so far; empty means the picker with nothing picked. */
  radicals: string[];
};

/** How the command is written back into the box once a radical is picked. */
export function formatRadicalCommand(radicals: readonly string[]): string {
  const names = radicals.join(" + ");
  return `${SEARCH_COMMAND_PREFIX}${RADICAL_COMMAND_NAMES[0]}${names ? ` ${names}` : " "}`;
}

/*
 * A command in progress is still a command. `:rad` with nothing after it must
 * open the picker rather than be read as a search for the letters r-a-d, or
 * the builder could never be opened by typing.
 */
const COMMAND = new RegExp(`^\\s*${SEARCH_COMMAND_PREFIX}([a-z]*)([\\s\\S]*)$`, "i");

/**
 * The command a query names, or null when it is an ordinary search.
 *
 * A partial name matches nothing until it is a name: `:r` is not yet the
 * radical command, because `:read` may be a command later and guessing from one
 * letter would make the box change its mind while somebody types.
 */
export function parseSearchCommand(query: string): RadicalCommand | null {
  const match = COMMAND.exec(query ?? "");
  if (!match) return null;

  const name = match[1]!.toLowerCase();
  if (!RADICAL_COMMAND_NAMES.includes(name as (typeof RADICAL_COMMAND_NAMES)[number])) return null;

  return { kind: "radicals", radicals: splitRadicals(match[2] ?? "") };
}

/**
 * The radicals named in the tail of the command.
 *
 * A radical can be named by its character or by its English name, so the split
 * happens on the separators only - a plus, a comma - and never on a space: a
 * space is inside "long time" and between 日 and 月, and treating it as a
 * separator would break the first to keep the second. Instead each part is
 * split by what it is made of. A part holding Japanese script is a run of
 * characters and becomes one radical each, so `日月` and `日 月` are the same
 * two; a part of Latin letters is one name, however many words it has.
 *
 * Duplicates are dropped: naming the same radical twice narrows nothing.
 */
const JAPANESE = /[぀-ヿ㐀-䶿一-鿿⺀-⿟]/;

function splitRadicals(tail: string): string[] {
  const kept: string[] = [];

  for (const part of tail.split(/[+,、。]+/)) {
    const trimmed = part.trim();
    if (trimmed.length === 0) continue;

    const named = JAPANESE.test(trimmed) ? [...trimmed.replace(/\s+/g, "")] : [trimmed.toLowerCase()];
    for (const name of named) {
      if (!kept.includes(name)) kept.push(name);
    }
  }

  return kept;
}

/** Whether the box holds a command, for surfaces that only need to know that. */
export function isSearchCommand(query: string): boolean {
  return parseSearchCommand(query) !== null;
}
