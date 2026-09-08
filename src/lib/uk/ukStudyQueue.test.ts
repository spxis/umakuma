import { describe, expect, it } from "vitest";

import { LADDER_STREAMS } from "@/lib/ladder/ladderStreams";

import { ladderColumns } from "./ladderColumns";
import { onOwnLadder } from "./ukStudyQueue";

/*
 * A subject has a level on each ladder, and every reader picks the column by
 * stream. The "coming up" route read `level` outright for everybody and the
 * strip labelled it with the member's prefix, so a UG member saw the exam
 * ordering's number under `UG`. This is the rule every reader in the queue
 * module now goes through.
 */
describe("onOwnLadder", () => {
  const row = { id: 8252, level: 17, ugLevel: 31, characters: "身" };

  it("reads the exam column for a UN member", () => {
    expect(onOwnLadder(row, ladderColumns(LADDER_STREAMS.un)).level).toBe(17);
  });

  it("reads the school-year column for a UG member, on the same row", () => {
    const own = onOwnLadder(row, ladderColumns(LADDER_STREAMS.ug));
    expect(own.level).toBe(31);
    expect(own.characters).toBe("身");
    /* The other column is still there for anything that wants both. */
    expect(own.ugLevel).toBe(31);
  });
});
