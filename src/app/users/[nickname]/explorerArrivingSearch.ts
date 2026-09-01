import { readExplorerSearch } from "@/lib/explorerSearchParam";

/**
 * Whether this page load is somebody arriving to find something.
 *
 * A search in the address means "find me this", and it outranks whatever the
 * explorer was last left set to. Following 犬 from the header search landed in
 * a lesson-mode queue: of 157 matches it showed 2, and not one of the 34 kanji
 * — the very character searched for among them. That reads as the search being
 * broken rather than as a queue mode being on, and no filter the reader can see
 * explains it, because the mode was restored from the last visit.
 *
 * `searchAndReveal` already widens the explorer's own filters when it finds
 * something. The queue mode, the tagged-list filter and the locked toggle are
 * restored a level above it, so they are checked here instead - skipping the
 * restore rather than undoing it a moment later, which is a race the restore
 * wins about half the time.
 */
export function arrivesWithSearch(params: URLSearchParams): boolean {
  return Boolean(readExplorerSearch(params));
}
