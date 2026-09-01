import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { gradeHref, parseGradeSegment } from "./gradeExplorerView";

const PAGE = "src/app/users/[nickname]/grades/[grade]/page.tsx";
const ROOT = "src/app/users/[nickname]/grades/page.tsx";
const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

/**
 * Searching has to stay on the grade you were looking at.
 *
 * The grade moved from the query into the path, and the reader that used to
 * take it out of the query went with it - correctly, since there is one
 * address for a grade now. What did not move was the search form: it went on
 * posting to the collection root with the grade as a hidden field, the shape
 * from before. The root reads no grade any more, it only opens the first one,
 * so searching from grade 3 landed on grade 1 with the search dropped too.
 *
 * This is what "change the thing and update every caller" is for. The reader
 * was removed and one caller was not looked at.
 */
describe("the grade search form", () => {
  const page = read(PAGE);

  it("submits to the grade's own address", () => {
    expect(page).toContain("/grades/${grade}`}");
  });

  /*
   * The hidden field was the whole mechanism for carrying the grade through a
   * submit. With the grade in the path there is nothing for it to do, and
   * leaving it would put a second, ignored copy of the grade in the query.
   */
  it("carries no grade in the query", () => {
    expect(page, "the grade belongs to the path now").not.toContain('name="grade"');
  });

  /* `q` is still a query parameter: it says how a collection is read. */
  it("still submits the search as a query", () => {
    expect(page).toContain('name="q"');
  });
});

describe("the address a grade link builds", () => {
  it("puts the grade in the path", () => {
    expect(gradeHref("john", 3)).toBe("/users/john/grades/3");
  });

  it("keeps the search and the page in the query", () => {
    expect(gradeHref("john", 3, 2, "水")).toBe("/users/john/grades/3?page=2&q=%E6%B0%B4");
  });

  /* A first page and an empty search are the default, so they are left off. */
  it("says nothing it does not have to", () => {
    expect(gradeHref("john", 1, 1, "  ")).toBe("/users/john/grades/1");
  });

  it("round-trips through the segment reader", () => {
    for (const grade of [1, 6, 9]) {
      expect(parseGradeSegment(String(grade))).toBe(grade);
    }
  });

  /*
   * A segment that names no grade is a wrong link rather than grade one -
   * quietly rendering a default makes a broken link look like a working one.
   */
  it.each(["", "nonsense", "0", "-1", "practice"])("refuses %p", (segment) => {
    expect(parseGradeSegment(segment)).toBeNull();
  });
});

describe("the collection root", () => {
  /* It is the way in, not a shim: the navigation points here. */
  it("opens the first grade rather than reading one from the query", () => {
    const root = read(ROOT);
    expect(root).toContain("DEFAULT_GRADE");
    expect(root, "no query reader should have survived the path move").not.toContain("searchParams");
  });
});
