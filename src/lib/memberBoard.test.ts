import { describe, expect, it } from "vitest";

import { memberPlacement, rankMemberBoard } from "./memberBoard";

type Row = { id: string; name: string; score: number };

const read = { score: (row: Row) => row.score, tiebreak: (row: Row) => row.name };

function board(rows: Row[]) {
  return rankMemberBoard(rows, read);
}

describe("placing members on a board", () => {
  it("orders best first", () => {
    const placed = board([
      { id: "b", name: "Bee", score: 10 },
      { id: "a", name: "Ay", score: 30 },
      { id: "c", name: "Cee", score: 20 },
    ]);

    expect(placed.map((row) => row.id)).toEqual(["a", "c", "b"]);
    expect(placed.map((row) => row.place)).toEqual([1, 2, 3]);
  });

  /*
   * The rule the whole module exists for. Two members on the same total are
   * both second and the next is fourth, the way a race is scored. Dense
   * ranking would make the next one third, which reads as though somebody was
   * overtaken by a total they matched.
   */
  it("shares a place on a tie and skips the next", () => {
    const placed = board([
      { id: "a", name: "Ay", score: 30 },
      { id: "b", name: "Bee", score: 20 },
      { id: "c", name: "Cee", score: 20 },
      { id: "d", name: "Dee", score: 10 },
    ]);

    expect(placed.map((row) => row.place)).toEqual([1, 2, 2, 4]);
  });

  /*
   * SPX printed the place on the first row of a tie and left the rest blank.
   * A board cannot work that out from the place alone - 2, 2 is legible only
   * once something says which of them is the repeat.
   */
  it("marks the repeats of a tie, not the first of it", () => {
    const placed = board([
      { id: "a", name: "Ay", score: 20 },
      { id: "b", name: "Bee", score: 20 },
      { id: "c", name: "Cee", score: 20 },
      { id: "d", name: "Dee", score: 10 },
    ]);

    expect(placed.map((row) => row.sharesPlace)).toEqual([false, true, true, false]);
  });

  it("orders equal scores by the tiebreak, and still shares the place", () => {
    const placed = board([
      { id: "z", name: "Zeta", score: 20 },
      { id: "a", name: "Alpha", score: 20 },
    ]);

    expect(placed.map((row) => row.name)).toEqual(["Alpha", "Zeta"]);
    expect(placed.map((row) => row.place)).toEqual([1, 1]);
  });

  describe("the distance to the member above", () => {
    it("is null for the leader, who has nobody to pass", () => {
      const placed = board([
        { id: "a", name: "Ay", score: 30 },
        { id: "b", name: "Bee", score: 10 },
      ]);

      expect(placed[0]!.toPassAbove).toBeNull();
    });

    it("is the gap to the row directly above, not to the leader", () => {
      const placed = board([
        { id: "a", name: "Ay", score: 100 },
        { id: "b", name: "Bee", score: 90 },
        { id: "c", name: "Cee", score: 75 },
      ]);

      expect(placed.map((row) => row.toPassAbove)).toEqual([null, 10, 15]);
    });

    /*
     * Zero and null are different facts and must not both become a dash: zero
     * is "you are level with them", null is "there is nobody above you".
     */
    it("is zero, not null, for a row level with the one above", () => {
      const placed = board([
        { id: "a", name: "Ay", score: 20 },
        { id: "b", name: "Bee", score: 20 },
      ]);

      expect(placed[0]!.toPassAbove).toBeNull();
      expect(placed[1]!.toPassAbove).toBe(0);
    });
  });

  it("leaves the caller's rows untouched", () => {
    const rows: Row[] = [
      { id: "b", name: "Bee", score: 10 },
      { id: "a", name: "Ay", score: 30 },
    ];
    board(rows);

    expect(rows.map((row) => row.id)).toEqual(["b", "a"]);
  });

  it("places an empty board without complaining", () => {
    expect(board([])).toEqual([]);
  });
});

describe("finding one member on a placed board", () => {
  const placed = board([
    { id: "a", name: "Ay", score: 30 },
    { id: "b", name: "Bee", score: 10 },
  ]);

  it("returns the row", () => {
    expect(memberPlacement(placed, "b")?.place).toBe(2);
  });

  it("returns null for somebody not on it, and for nobody at all", () => {
    expect(memberPlacement(placed, "nope")).toBeNull();
    expect(memberPlacement(placed, null)).toBeNull();
  });
});
