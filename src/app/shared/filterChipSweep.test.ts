import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

/*
 * A filter label with its count is drawn by FilterChip, and by nothing else.
 *
 * John found the same count printed four ways in one afternoon - `ALL (2,211)`,
 * `17 49`, `Radicals 3`, `COMMON 44` - and asked how it passed review. Two of
 * the four were built that day beside the component that already existed.
 * This fails the next one: the idioms every copy used for its little grey
 * count and its inline on/off tone.
 */
/*
 * The idioms, not every bracket: `({total} total)` in a heading is a tally,
 * a different kind of thing, and admin panels are full of them. What this
 * catches is a chip's little grey count drawn by hand beside its label.
 */
const HAND_DRAWN = [
  /text-white\/80" : "text-foreground\/60"/, // the copied count span
  /text-white\/70" : "text-foreground\/60"/, // the search row's copy of it
];

function pages(): string[] {
  return execFileSync("git", ["ls-files", "--", "src/app/**/*.tsx"], { encoding: "utf8" })
    .split("\n")
    .filter((file) => file.endsWith(".tsx") && !file.endsWith(".test.tsx") && !file.endsWith("shared/FilterChip.tsx"));
}

describe("a count on a filter chip is drawn one way", () => {
  it("finds no hand-drawn count outside FilterChip", () => {
    const hits = pages().flatMap((file) => {
      const source = readFileSync(file, "utf8");
      return HAND_DRAWN.flatMap((pattern) => (pattern.test(source) ? [`${file}: ${pattern.source}`] : []));
    });
    expect(hits).toEqual([]);
  });
});
