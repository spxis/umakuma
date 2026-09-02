import { RADICAL_SEARCH_COPY } from "./radicalSearchCopy";

/**
 * How anybody finds out the commands exist.
 *
 * The radical lookup used to be a button inside the search field, which was
 * discoverable and was also noise in the one place a member is trying to type.
 * As a command it is neither, so it has to be said somewhere - and the place to
 * say it is the empty box, where there is nothing else to read and the reader
 * has not yet started doing something else.
 */
export default function SearchCommandHint() {
  return (
    <p className="border-t border-line/60 px-4 py-2 text-[11px] font-semibold text-foreground/60">
      {RADICAL_SEARCH_COPY.commandHint}
    </p>
  );
}
