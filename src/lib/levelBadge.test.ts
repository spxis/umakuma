import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

import { describe, expect, it } from "vitest";

import { levelBadge, LEVEL_SYSTEMS, ukLevelBadge, wkLevelBadge } from "./levelBadge";

/**
 * A level with no system in front of it is a number with two possible
 * meanings, and the site drew one for every subject on every surface. These
 * assertions are what keep it from coming back.
 */
describe("levelBadge", () => {
  it("names the system in front of the number", () => {
    expect(wkLevelBadge(17)).toBe("WK17");
    expect(ukLevelBadge(17)).toBe("UK17");
    expect(levelBadge(LEVEL_SYSTEMS.wanikani, 60)).toBe("WK60");
  });

  it("is null for no level, so a caller draws nothing rather than WK0", () => {
    /* An unlevelled subject is not on level zero. It is not on the ladder. */
    expect(wkLevelBadge(null)).toBeNull();
    expect(wkLevelBadge(undefined)).toBeNull();
    expect(ukLevelBadge(null)).toBeNull();
  });

  it("leaves no bare L{n} drawn anywhere in the app", () => {
    /* John, on seeing the UmaKuma Explorer: "WK levels should now read
       WK17... umakuma is UK17. No more L17 anywhere." Grepped rather than
       asserted per file, because the failure this catches is a *new* surface
       reaching for the old form, which no per-file test would see. */
    const found = execFileSync(
      "git",
      ["grep", "-n", "-E", String.raw`(\bL\{[a-zA-Z]|` + "`" + String.raw`L\$\{)`, "--", "src/app", "src/lib"],
      { encoding: "utf8" },
    )
      .split("\n")
      .filter(Boolean)
      .filter((line) => !line.includes(".test."))
      /* Two exemptions, both the same cause: a member's own uploaded library
         is a third ladder, and neither surface can say whose level it is
         drawing. The manager page is about one library throughout; the Study
         header draws the level inside "<library name> (L3)", which names the
         ladder beside it. Both get a prefix once the library's own is decided.
         Recorded on the board — remove these when it is.

         The second path is the label helper, which now answers WK3 or UK3 for
         the two real ladders and keeps the bare form only for a library. It
         moved from StudyExplorerPanel into the group's constants when the
         header came out of the panel, and this list did not move with it. */
      .filter(
        (line) =>
          !line.startsWith("src/app/users/[nickname]/StudySourceLibraryItemsManager.tsx") &&
          !line.startsWith("src/app/users/[nickname]/study-explorer/components/StudyExplorer.constants.ts"),
      );

    expect(found, `bare level badges:\n${found.join("\n")}`).toEqual([]);
  });

  it("has the module every surface reads it from", () => {
    expect(readFileSync("src/lib/levelBadge.ts", "utf8")).toContain("LEVEL_SYSTEMS");
  });
});
