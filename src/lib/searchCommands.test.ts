import { describe, expect, it } from "vitest";

import { formatRadicalCommand, isSearchCommand, parseSearchCommand } from "./searchCommands";

/**
 * The query is the state.
 *
 * The picker used to hold the chosen radicals in a dialog, where they could not
 * be typed, copied, linked or walked back to. Written into the box they are all
 * four.
 */
describe("parseSearchCommand", () => {
  it("opens the picker on any of the names somebody might type", () => {
    for (const typed of [":radicals", ":radical", ":rad"]) {
      expect(parseSearchCommand(typed)).toEqual({ kind: "radicals", radicals: [] });
    }
  });

  it("ignores the case and the space in front", () => {
    expect(parseSearchCommand("  :RAD 日")).toEqual({ kind: "radicals", radicals: ["日"] });
  });

  it("reads the radicals however they were separated", () => {
    const expected = { kind: "radicals", radicals: ["日", "月"] };

    expect(parseSearchCommand(":radicals 日 + 月")).toEqual(expected);
    expect(parseSearchCommand(":radicals 日,月")).toEqual(expected);
    expect(parseSearchCommand(":radicals 日月")).toEqual(expected);
  });

  /* Picking the same radical twice narrows nothing, so it is picked once. */
  it("keeps each radical once, in the order they were given", () => {
    expect(parseSearchCommand(":rad 月 + 日 + 月")?.radicals).toEqual(["月", "日"]);
  });

  /*
   * One letter is not yet a name. Guessing from `:r` would make the box change
   * its mind under somebody's fingers, and `:read` may be a command later.
   */
  it("waits for the whole name", () => {
    expect(parseSearchCommand(":r")).toBeNull();
    expect(parseSearchCommand(":radi")).toBeNull();
    expect(parseSearchCommand(":radicalise 日")).toBeNull();
  });

  it("leaves an ordinary search alone", () => {
    expect(parseSearchCommand("water")).toBeNull();
    expect(parseSearchCommand("日")).toBeNull();
    expect(parseSearchCommand("Heisei 3")).toBeNull();
    expect(parseSearchCommand("")).toBeNull();
    expect(isSearchCommand("500 yen")).toBe(false);
  });
});

describe("formatRadicalCommand", () => {
  it("writes what the parser reads", () => {
    const written = formatRadicalCommand(["日", "月"]);

    expect(written).toBe(":radicals 日 + 月");
    expect(parseSearchCommand(written)?.radicals).toEqual(["日", "月"]);
  });

  /* An empty command still opens the picker, and leaves the cursor a place. */
  it("keeps the command when the last radical is taken back", () => {
    expect(parseSearchCommand(formatRadicalCommand([]))).toEqual({ kind: "radicals", radicals: [] });
  });
});
