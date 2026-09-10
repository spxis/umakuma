import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { trackedSourceFiles } from "@/lib/sourceSweep";

/*
 * A glyph gets its colour from its subject type, and every caller says which.
 *
 * `SubjectPill` falls through to `subjectGlyphTone(subjectType ?? "")`, which
 * returns `text-foreground` for anything it cannot recognise - so a caller
 * passing neither `subjectType` nor `tone` draws kanji in body-text colour
 * while still reading, in review and in a grep for hand-rolled tiles, as
 * correct use of the shared component. The curriculum changes panel shipped 95
 * kanji that way and John found it by looking: "they are white! we should
 * never have any white kanji radicals etc... they all have a colour."
 *
 * This is the check that grep cannot do. There is no allow list: the one call
 * site that looked like it could not know - the selection panel, which holds a
 * bare `ReadonlySet<string>` because the character is the only identifier a
 * school grade, a JLPT level and a WaniKani level share - reaches the panel
 * through `KanjiSelectionBar` and through nothing else, so the answer was
 * there to be declared rather than excused.
 */
/** The text of one `<SubjectPill ... />` tag, brace-aware so props survive. */
function pillTags(source: string): string[] {
  const tags: string[] = [];
  let from = source.indexOf("<SubjectPill");
  while (from !== -1) {
    let depth = 0;
    let end = from;
    for (let index = from; index < source.length; index += 1) {
      const char = source[index];
      if (char === "{") depth += 1;
      else if (char === "}") depth -= 1;
      else if (char === ">" && depth === 0) {
        end = index;
        break;
      }
    }
    tags.push(source.slice(from, end + 1));
    from = source.indexOf("<SubjectPill", end + 1);
  }
  return tags;
}

describe("every subject pill is told what it is drawing", () => {
  it("passes subjectType or tone at every call site", () => {
    const undressed = trackedSourceFiles(["src/**/*.tsx"])
      .filter((file) => !file.includes("SubjectPill.test.tsx") && !file.endsWith("shared/SubjectPill.tsx"))
      .flatMap((file) => {
        const relative = file.slice(file.indexOf("src/"));
        return pillTags(readFileSync(file, "utf8"))
          .filter((tag) => !tag.includes("subjectType") && !tag.includes("tone"))
          .map(() => relative);
      });

    expect([...new Set(undressed)]).toEqual([]);
  });

});
