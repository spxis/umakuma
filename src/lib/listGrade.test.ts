import { describe, expect, it } from "vitest";

import { LIST_GRADES, accuracyOf, asPercent, gradeFor, markIsStale } from "./listGrade";

describe("how much of a list is known", () => {
  it("is untouched when nothing has been started", () => {
    expect(gradeFor(0, 10)).toBe(LIST_GRADES.untouched);
  });

  /* An empty list is not a triumph; it has nothing to be solid about. */
  it("is untouched when there is nothing to know", () => {
    expect(gradeFor(0, 0)).toBe(LIST_GRADES.untouched);
  });

  it("walks the thirds", () => {
    expect(gradeFor(1, 10)).toBe(LIST_GRADES.starting);
    expect(gradeFor(5, 10)).toBe(LIST_GRADES.getting);
    expect(gradeFor(8, 10)).toBe(LIST_GRADES.nearly);
  });

  /* "Nearly" that includes 99% is a word nobody trusts the second time. */
  it("is solid only when all of it is known", () => {
    expect(gradeFor(99, 100)).toBe(LIST_GRADES.nearly);
    expect(gradeFor(100, 100)).toBe(LIST_GRADES.solid);
  });
});

describe("how well the answering went", () => {
  /*
   * Null and zero are different answers. A list nobody has been reviewed on
   * has no accuracy; 0% means every answer was wrong, and showing that to
   * somebody who has not sat down with the list tells them they are failing.
   */
  it("is nothing at all when nobody has answered", () => {
    expect(accuracyOf({ correct: 0, total: 0 })).toBeNull();
  });

  it("is zero when every answer was wrong", () => {
    expect(accuracyOf({ correct: 0, total: 7 })).toBe(0);
  });

  it("is the share correct", () => {
    expect(asPercent(accuracyOf({ correct: 3, total: 4 })!)).toBe(75);
  });
});

describe("the owner's studied mark", () => {
  /* A list finished in March and added to in June is not finished. */
  it("goes stale when the list changes after it", () => {
    expect(markIsStale("2026-03-01T00:00:00.000Z", "2026-06-01T00:00:00.000Z")).toBe(true);
  });

  it("stands while the list has not changed since", () => {
    expect(markIsStale("2026-06-01T00:00:00.000Z", "2026-03-01T00:00:00.000Z")).toBe(false);
  });

  it("is nothing to go stale when the list was never marked", () => {
    expect(markIsStale(null, "2026-06-01T00:00:00.000Z")).toBe(false);
  });
});
