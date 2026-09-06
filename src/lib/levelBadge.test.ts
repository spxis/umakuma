import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

import { describe, expect, it } from "vitest";

import { levelBadge, LEVEL_SYSTEMS, libraryLevelBadge, ukLevelBadge, wkLevelBadge } from "./levelBadge";

/**
 * A level with no system in front of it is a number with two possible
 * meanings, and the site drew one for every subject on every surface. These
 * assertions are what keep it from coming back.
 */
describe("levelBadge", () => {
  it("names the system in front of the number", () => {
    expect(wkLevelBadge(17)).toBe("WK17");
    expect(ukLevelBadge(17)).toBe("UN17");
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
       WK17... umakuma is UN17. No more L17 anywhere." Grepped rather than
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
      /* No exemptions. A member's own library was the last bare L on the
         site and it has its own prefix now - the two surfaces that drew it,
         the library manager's level dropdown and the Study header's
         "<library name> (LIB3)", both ask levelBadge like everything else. */
      ;

    expect(found, `bare level badges:\n${found.join("\n")}`).toEqual([]);
  });

  it("has the module every surface reads it from", () => {
    expect(readFileSync("src/lib/levelBadge.ts", "utf8")).toContain("LEVEL_SYSTEMS");
  });
});

describe("the member's own library", () => {
  /* The third ladder, and the last surface still drawing a bare L. It was
     defensible while the library was named right beside the number, and
     stopped being so when L was reserved for the XP rank: a bare L3 next to a
     library name reads as rank 3, a different ladder and a different number. */
  it("has a prefix of its own", () => {
    expect(libraryLevelBadge(3)).toBe("LIB3");
    expect(LEVEL_SYSTEMS.library).toBe("LIB");
  });

  it("draws nothing for a level that is not there, like the others", () => {
    expect(libraryLevelBadge(null)).toBeNull();
    expect(libraryLevelBadge(undefined)).toBeNull();
  });

  it("is distinct from every other ladder's prefix", () => {
    const prefixes = Object.values(LEVEL_SYSTEMS);
    expect(new Set(prefixes).size).toBe(prefixes.length);
    /* And from the XP rank's bare L, which lives in xpRanks. */
    for (const prefix of prefixes) expect(prefix).not.toBe("L");
  });

  it("is what the two surfaces that used to draw a bare L now ask for", () => {
    for (const file of [
      "src/app/users/[nickname]/StudySourceLibraryItemsManager.tsx",
      "src/app/users/[nickname]/study-explorer/components/StudyExplorer.constants.ts",
    ]) {
      expect(readFileSync(file, "utf8")).toContain("libraryLevelBadge");
    }
  });
});
