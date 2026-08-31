import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Every surface that lists subjects offers both densities.
 *
 * AGENTS.md has required this for a while, and the grade explorer still shipped
 * grid-only: a screenful of cards with no way to scan a whole grade as rows.
 * Nobody noticed until it was pointed out, which is what a rule with no test
 * behind it gets you.
 *
 * The scan looks for a component that builds its own multi-column grid of
 * subjects, and requires the density toggle somewhere in its folder - it
 * usually belongs on the parent that owns the toolbar, not on the grid itself.
 */

const SRC = join(process.cwd(), "src");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (full.endsWith(".tsx")) out.push(full);
  }
  return out;
}

/** A hand-rolled responsive grid, as opposed to a list or a fixed layout. */
function buildsASubjectGrid(source: string): boolean {
  if (!source.includes("auto-fill") && !source.includes("auto-fit")) return false;
  /*
   * Subject grids render a glyph in the Japanese face; toolbars and stat tiles
   * do not. Both spellings, because the raw font class moved behind
   * `JP_TEXT_CLASS` when the no-translate marker was paired with it - and for a
   * moment this check went looking for a literal no component contained any
   * more, which is a guard that passes by finding nothing to inspect.
   */
  return source.includes("--font-jp-current") || source.includes("JP_TEXT_CLASS");
}

function folderOf(file: string): string {
  return file.slice(0, file.lastIndexOf("/"));
}

describe("subject lists", () => {
  it("offer grid and list wherever they build their own grid", () => {
    const files = walk(SRC);
    const offenders: string[] = [];
    const inspected: string[] = [];

    for (const file of files) {
      if (!buildsASubjectGrid(readFileSync(file, "utf8"))) continue;
      inspected.push(file);

      const folder = folderOf(file);
      const siblings = files.filter((candidate) => folderOf(candidate) === folder);
      const offersToggle = siblings.some((candidate) =>
        readFileSync(candidate, "utf8").includes("SubjectViewModeToggle"),
      );

      if (!offersToggle) {
        offenders.push(file.replace(SRC, "src"));
      }
    }

    /*
     * A guard that inspects nothing passes. This one did, briefly, when the
     * class it detects grids by was renamed - so it now says out loud that it
     * found some.
     */
    expect(inspected.length, "found no subject grids at all - the detector is broken").toBeGreaterThan(0);
    expect(offenders, "these list subjects in a grid with no way to switch to rows").toEqual([]);
  });
});
