import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { trackedSourceFiles } from "./sourceSweep";

/*
 * `a ?? a` is a fallback to itself: it reads as a fallback and is not one.
 * `StudyTagListsBody` carried `item.unLevel ?? item.unLevel ?? null` for a
 * release, left behind when `ukLevel` was renamed to `unLevel` by search and
 * replace and the second half of `item.unLevel ?? item.ukLevel` followed the
 * first. A reader assumes there was a second source; there was not.
 */
/* Whole operand on the left - `x.page ?? page` is a different value - and whole on the right. */
const SELF_COALESCE = /(?<![\w$.?])([A-Za-z_$][\w$]*(?:(?:\?\.|\.)[A-Za-z_$][\w$]*)*)\s*\?\?\s*\1(?![\w$.(?])/;

function trackedSources(): string[] {
  return trackedSourceFiles();
}

describe("no value falls back to itself", () => {
  it("finds no `x ?? x` in the sources", () => {
    const hits = trackedSources().flatMap((file) => {
      const lines = readFileSync(file, "utf8").split("\n");
      return lines.flatMap((line, index) => (SELF_COALESCE.test(line) ? [`${file}:${index + 1}: ${line.trim()}`] : []));
    });
    expect(hits).toEqual([]);
  });
});
