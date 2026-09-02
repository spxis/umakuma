import { describe, expect, it } from "vitest";

import { LIST_ITEM_KINDS } from "./domainConstants";
import { addedToSource, withItemsTaken } from "./listSourceSync";
import type { StudyListItemRef } from "./studyListRules";

const kanji = (key: string, note?: string): StudyListItemRef => ({
  kind: LIST_ITEM_KINDS.kanji,
  key,
  ...(note ? { note } : {}),
});

const keys = (items: readonly StudyListItemRef[]) => items.map((item) => item.key);

/**
 * A copy is a snapshot, and the list it came from keeps growing.
 *
 * Subscribing means no longer owning what you are looking at; copying again
 * means losing everything you changed. Asking what is new is the third way.
 */
describe("addedToSource", () => {
  it("answers with what the source holds and the copy does not", () => {
    const source = [kanji("水"), kanji("火"), kanji("土")];
    const copy = [kanji("水")];

    expect(keys(addedToSource(source, copy))).toEqual(["火", "土"]);
  });

  it("keeps the source's order", () => {
    expect(keys(addedToSource([kanji("土"), kanji("火")], []))).toEqual(["土", "火"]);
  });

  it("answers with nothing when the copy is level with its source", () => {
    const same = [kanji("水"), kanji("火")];

    expect(addedToSource(same, same)).toEqual([]);
  });

  /* A tidier friend is not grounds for deleting from somebody else's list. */
  it("says nothing about what the source has dropped", () => {
    expect(addedToSource([kanji("水")], [kanji("水"), kanji("火")])).toEqual([]);
  });

  it("counts a repeated item once", () => {
    expect(keys(addedToSource([kanji("火"), kanji("火")], []))).toEqual(["火"]);
  });

  /* The same character as a word is a different thing with its own page. */
  it("tells a kanji apart from a word written the same way", () => {
    const source = [kanji("朝"), { kind: LIST_ITEM_KINDS.vocabulary, key: "朝" }];

    expect(addedToSource(source, [kanji("朝")])).toEqual([{ kind: LIST_ITEM_KINDS.vocabulary, key: "朝" }]);
  });
});

describe("withItemsTaken", () => {
  it("appends rather than reshuffling, since the member arranged this list", () => {
    const copy = [kanji("土"), kanji("水")];

    expect(keys(withItemsTaken(copy, [kanji("火")]))).toEqual(["土", "水", "火"]);
  });

  /* A note is the member's own writing; a pull must not touch it. */
  it("leaves an item it already holds exactly as it is", () => {
    const copy = [kanji("水", "the one I keep writing backwards")];
    const result = withItemsTaken(copy, [kanji("水"), kanji("火")]);

    expect(result[0]?.note).toBe("the one I keep writing backwards");
    expect(keys(result)).toEqual(["水", "火"]);
  });

  it("takes one item without taking the rest", () => {
    expect(keys(withItemsTaken([kanji("水")], [kanji("火")]))).toEqual(["水", "火"]);
  });
});
