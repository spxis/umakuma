import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The print flag is composed in exactly one place.
 *
 * Two surfaces had written it by hand and both were wrong, in opposite
 * directions and for the same reason - a link that is nearly the worksheet's
 * looks like something you can reach with string surgery.
 *
 * The list's page appended `?go=1` to the worksheet address. That was correct
 * until a shared list's address started carrying `?key=`, at which point the
 * two queries ran together, the key absorbed the flag, and Print 404ed on
 * precisely the lists worth sharing.
 *
 * The card went the other way: it was handed one href and stripped a trailing
 * `?go=1` to make the other. When the prop stopped carrying that flag the
 * regex matched nothing, both pills became the same link, and the Print pill
 * silently stopped printing - no error, no 404, just a button that did what
 * the button beside it did.
 *
 * Neither is the kind of thing a type catches, so this does: `listPrintHref`
 * is the only thing allowed to spell the flag.
 */

const SOURCE_ROOT = join(process.cwd(), "src");

/** Where the flag is defined, and the one helper that composes it. */
const ALLOWED = ["practice/sheetLink.ts", "practice/practiceAddress.ts", "practice/sheetOptions.ts"];

/**
 * Comments are stripped first: the files that fixed this bug describe it, and
 * a rule that forbids explaining itself is a rule nobody can document.
 */
function code(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry) ? [path] : [];
  });
}

describe("the print flag", () => {
  it("is composed by listPrintHref and nowhere else", () => {
    const offenders = sourceFiles(SOURCE_ROOT)
      .filter((path) => !ALLOWED.some((allowed) => path.endsWith(allowed)))
      .filter((path) => {
        /* Writing the flag into a link, or picking it back out of one. */
        const source = code(readFileSync(path, "utf8"));
        return /go=1/.test(source) || /PRINT_NOW_PARAM\}=1/.test(source);
      })
      .map((path) => path.slice(SOURCE_ROOT.length + 1));

    expect(offenders).toEqual([]);
  });
});
