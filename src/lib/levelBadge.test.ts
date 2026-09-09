import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { sweepSources } from "./sourceSweep";

import { levelBadge, LEVEL_SYSTEMS, libraryLevelBadge, ourLevelBadgeFor, unLevelBadge, wkLevelBadge } from "./levelBadge";

/**
 * A level with no system in front of it is a number with two possible
 * meanings, and the site drew one for every subject on every surface. These
 * assertions are what keep it from coming back.
 */
describe("levelBadge", () => {
  it("names the system in front of the number", () => {
    expect(wkLevelBadge(17)).toBe("WK17");
    expect(unLevelBadge(17)).toBe("UN17");
    expect(levelBadge(LEVEL_SYSTEMS.wanikani, 60)).toBe("WK60");
  });

  it("is null for no level, so a caller draws nothing rather than WK0", () => {
    /* An unlevelled subject is not on level zero. It is not on the ladder. */
    expect(wkLevelBadge(null)).toBeNull();
    expect(wkLevelBadge(undefined)).toBeNull();
    expect(unLevelBadge(null)).toBeNull();
  });

  it("leaves no bare L{n} drawn anywhere in the app", () => {
    /* John, on seeing the UmaKuma Explorer: "WK levels should now read
       WK17... umakuma is UN17. No more L17 anywhere." Grepped rather than
       asserted per file, because the failure this catches is a *new* surface
       reaching for the old form, which no per-file test would see. */
    const found = sweepSources(String.raw`(\bL\{[a-zA-Z]|` + "`" + String.raw`L\$\{)`, ["src/app", "src/lib"], {
      extended: true,
    });

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

/*
 * The slot names the ladder. A badge that prefixed one number by the viewer's
 * stream was right only while every feeder passed the stream-correct number,
 * and a custom library's level came through that slot as UN3.
 */
describe("ourLevelBadgeFor", () => {
  it("labels whichever slot is filled", () => {
    expect(ourLevelBadgeFor({ unLevel: 9 })).toBe("UN9");
    expect(ourLevelBadgeFor({ ugLevel: 23 })).toBe("UG23");
    expect(ourLevelBadgeFor({ libraryLevel: 3 })).toBe("LIB3");
  });

  it("draws nothing when no slot is filled", () => {
    expect(ourLevelBadgeFor({})).toBeNull();
    expect(ourLevelBadgeFor({ unLevel: null, ugLevel: undefined, libraryLevel: null })).toBeNull();
  });
});
