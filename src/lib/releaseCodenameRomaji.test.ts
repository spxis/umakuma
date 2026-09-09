import { describe, expect, it } from "vitest";

import { CODENAMES_PART_1 } from "./releaseCodenameList1";
import { CODENAMES_PART_2 } from "./releaseCodenameList2";
import { CODENAMES_PART_3 } from "./releaseCodenameList3";
import { romajiMatchesReading } from "./releaseTake";

const SHIPPED = [...CODENAMES_PART_1, ...CODENAMES_PART_2, ...CODENAMES_PART_3];

/*
 * 1.97.0 was stamped "Nintei" against the reading にちょう, which romanises as
 * "nichou" - two unrelated words on one release. It was caught by rereading
 * the line, not by the gate: nothing compared the romaji with the reading, so
 * any unused word passed.
 */
describe("a codename's romaji is a reading of its reading", () => {
  /*
   * The shipped list is the fixture, which is the point: the threshold was
   * measured against it rather than chosen, so if a future name drifts
   * further than any of 597 predecessors, this is where it stops.
   */
  it("accepts every codename ever shipped", () => {
    const rejected = SHIPPED.filter((codename) => !romajiMatchesReading(codename.romaji, codename.reading));

    expect(rejected.map((codename) => `${codename.romaji} / ${codename.reading}`)).toEqual([]);
  });

  it("refuses a romaji that is simply a different word", () => {
    expect(romajiMatchesReading("Nintei", "にちょう")).toBe(false);
    expect(romajiMatchesReading("Nichou", "にちょう")).toBe(true);
  });

  /*
   * The variance that has to survive, all of it real and all of it in the
   * shipped list: a particle written as it is said, and a long vowel written
   * short.
   */
  it("allows a particle written as it is spoken", () => {
    expect(romajiMatchesReading("Honegumi wa Ugokanai", "ほねぐみはうごかない")).toBe(true);
    expect(romajiMatchesReading("Rui o Yobu", "るいをよぶ")).toBe(true);
  });

  it("allows a long vowel written short", () => {
    expect(romajiMatchesReading("Soshun Sogen", "そうしゅんそうげん")).toBe(true);
  });

  /* Spacing and capitals are a style, not a claim about the reading. */
  it("ignores spacing and capitals", () => {
    expect(romajiMatchesReading("TORI WAKE", "とりわけ")).toBe(true);
  });
});
