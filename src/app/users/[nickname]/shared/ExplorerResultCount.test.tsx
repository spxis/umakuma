/**
 * @vitest-environment jsdom
 */
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { clearExplorerSearchNow } from "../explorerSearchActions";
import { ExplorerSearchNotice } from "./ExplorerFilterNotice";
import { EXPLORER_RESULT_COPY, explorerShowingText } from "./explorerResultCopy";

/**
 * A search that has narrowed the list has to say so on the list.
 *
 * John had a text search running on the study explorer and read "Showing 1/100
 * items". Both numbers were correct - the search picked one, and there really
 * are a hundred - and together they read as ninety-nine reviews having gone
 * missing, because nothing on the page named the search. The box that set it
 * lives inside a filter panel that is shut by default, so there was nothing to
 * notice and nothing to switch off.
 */
describe("the results line", () => {
  it("counts out of a total rather than as a fraction", () => {
    /* "Showing 1/100 items" was one of three spellings across three explorers
       carrying the same search bar, and the only one that read as a fraction. */
    expect(explorerShowingText("1", "100", EXPLORER_RESULT_COPY.itemsNoun)).toBe("Showing 1 of 100 items");
  });
});

describe("the search notice", () => {
  it("names the term that is narrowing the list", () => {
    const markup = renderToStaticMarkup(<ExplorerSearchNotice term="海" onClear={() => {}} />);
    expect(markup).toContain("Search: 海");
    expect(markup).toContain(EXPLORER_RESULT_COPY.searchChipHint);
  });

  it("draws nothing when no search is running", () => {
    expect(renderToStaticMarkup(<ExplorerSearchNotice term="" onClear={() => {}} />)).toBe("");
  });

  it("refuses translation, because the term is whatever the member typed", () => {
    /* A search for 海 handed to Chrome's translator comes back as "sea", and
       the chip would then name a search the page is not running. */
    const markup = renderToStaticMarkup(<ExplorerSearchNotice term="海" onClear={() => {}} />);
    expect(markup).toContain('translate="no"');
  });
});

describe("clearing the search from the notice", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/users/john/study?q=%E6%B5%B7&level=17");
  });

  it("takes the term out of the address and leaves the other filters alone", () => {
    clearExplorerSearchNow();
    const params = new URLSearchParams(window.location.search);
    expect(params.get("q")).toBeNull();
    expect(params.get("level")).toBe("17");
  });

  it("tells every reader of the search that it is over", () => {
    const heard = vi.fn();
    window.addEventListener("wr:explorer-search-clear", heard);
    clearExplorerSearchNow();
    window.removeEventListener("wr:explorer-search-clear", heard);
    expect(heard).toHaveBeenCalledTimes(1);
  });

  it("leaves no bare question mark behind when it was the only parameter", () => {
    window.history.replaceState(null, "", "/users/john/study?q=%E6%B5%B7");
    clearExplorerSearchNow();
    expect(window.location.search).toBe("");
  });
});
