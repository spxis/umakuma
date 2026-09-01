/**
 * How every explorer carries a search in its address.
 *
 * There were four names for one idea. The grade explorer used `q`, and the
 * other three each had their own - `findLevel`, `findJlpt`, `findStudy` - so
 * the shared search bar coped by writing all three on every submit and reading
 * whichever one matched the surface it was on. It worked, and it meant no link
 * to a search could be guessed: the address for "find 水 here" depended on
 * which explorer "here" was.
 *
 * One name now, and it is `q`, because that is what a reader expects and what
 * the grade explorer already used. The old three are still read so that
 * bookmarks and links already sent to people keep working; nothing writes them
 * any more, so they drain away rather than being carried forever.
 */

export const EXPLORER_SEARCH_PARAM = "q";

/** Written by earlier versions, still read so existing links survive. */
export const LEGACY_EXPLORER_SEARCH_PARAMS = ["findLevel", "findJlpt", "findStudy"] as const;

/** The search in this address, whichever name it arrived under. */
export function readExplorerSearch(params: URLSearchParams): string {
  const current = params.get(EXPLORER_SEARCH_PARAM)?.trim();
  if (current) return current;

  for (const legacy of LEGACY_EXPLORER_SEARCH_PARAMS) {
    const value = params.get(legacy)?.trim();
    if (value) return value;
  }

  return "";
}

/**
 * Put a search into the address under the one name, and remove the old ones.
 *
 * Clearing the legacy names matters as much as setting `q`: a link that arrived
 * with `findJlpt=水` would otherwise keep it alongside the new parameter, and
 * the next reader would not be able to tell which one the page was obeying.
 */
export function writeExplorerSearch(params: URLSearchParams, query: string): void {
  const trimmed = query.trim();
  if (trimmed) {
    params.set(EXPLORER_SEARCH_PARAM, trimmed);
  } else {
    params.delete(EXPLORER_SEARCH_PARAM);
  }

  for (const legacy of LEGACY_EXPLORER_SEARCH_PARAMS) {
    params.delete(legacy);
  }
}

/** Take the search out of the address entirely, old names included. */
export function clearExplorerSearch(params: URLSearchParams): void {
  writeExplorerSearch(params, "");
}
