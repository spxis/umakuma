import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { APP_VERSION, APP_VERSION_RELEASE } from "./appVersion";
import { codenameForRelease } from "./releaseCodenames";
import {
  compareVersions,
  isProductionVersion,
  PRODUCTION_MAJOR,
  RELEASE_STEPS,
  versionAfter,
} from "./releaseOrdinal";

describe("what a version number means", () => {
  /* John: "major is the big releases", minor is new features, patch is
     tweaks - and "UK reviews is our first big release. Everything else was
     v0." */
  it("moves the minor for a feature and resets the patch", () => {
    expect(versionAfter("1.6.4", RELEASE_STEPS.feature)).toBe("1.7.0");
  });

  it("moves the patch for a tweak", () => {
    expect(versionAfter("1.6.4", RELEASE_STEPS.tweak)).toBe("1.6.5");
  });

  it("moves the major for a big release, and starts it clean", () => {
    expect(versionAfter("1.6.4", RELEASE_STEPS.major)).toBe("2.0.0");
  });

  /* There is no 0.x minor to carry forward: the scheme starts at 1.0.0. */
  it("leaves v0 for 1.0.0 whatever step is asked for", () => {
    for (const step of Object.values(RELEASE_STEPS)) {
      expect(versionAfter("0.381.0", step)).toBe("1.0.0");
    }
  });

  it("knows which side of production a version is on", () => {
    expect(isProductionVersion("0.381.0")).toBe(false);
    expect(isProductionVersion("1.0.0")).toBe(true);
    expect(PRODUCTION_MAJOR).toBe(1);
  });

  it("orders versions field by field, because no field is the count", () => {
    expect(compareVersions("1.7.0", "1.6.9")).toBeGreaterThan(0);
    expect(compareVersions("1.6.4", "1.6.5")).toBeLessThan(0);
    expect(compareVersions("2.0.0", "1.99.99")).toBeGreaterThan(0);
    expect(compareVersions("1.0.0", "0.381.0")).toBeGreaterThan(0);
  });

  it("refuses a string that is not a version", () => {
    expect(() => versionAfter("not-a-version", RELEASE_STEPS.feature)).toThrow();
    expect(() => compareVersions("1.0.0", "nope")).toThrow();
  });
});

describe("the codenames survive the renumbering", () => {
  const entries = JSON.parse(readFileSync("src/data/featureTimeline.json", "utf8")) as {
    version?: string;
    release?: number;
    name: string;
  }[];
  const shipped = entries.filter((entry) => entry.version);

  /* The list is positional - the 467th release takes the 467th name - and the
     version stopped carrying the count when the three fields took on their
     ordinary meanings. So the count is recorded on the release. */
  it("numbers every release 1..N with no gaps", () => {
    const releases = shipped.map((entry) => entry.release).sort((a, b) => (a ?? 0) - (b ?? 0));
    expect(releases).toEqual(releases.map((_, index) => index + 1));
  });

  it("still names every release the record holds", () => {
    for (const entry of shipped) {
      expect(codenameForRelease(entry.release!), entry.name).not.toBeNull();
    }
  });

  it("keeps the footer's release and version on the latest entry", () => {
    const last = shipped.reduce((a, b) => ((a.release ?? 0) > (b.release ?? 0) ? a : b));
    expect(APP_VERSION).toBe(last.version);
    expect(APP_VERSION_RELEASE).toBe(last.release);
  });
});

describe("the take keeps all four numbers together", () => {
  /* The count is written in two places - the entry and the footer - and only
     the entry was being updated, so the first release after the renumbering
     failed the gate rather than shipping with a stale count. */
  it("rewrites the footer's release alongside its version", () => {
    const lib = readFileSync("src/lib/releaseTake.ts", "utf8");
    expect(lib).toContain("APP_VERSION_RELEASE = ${release};");
    const script = readFileSync("scripts/release-take.ts", "utf8");
    expect(script).toContain("getVancouverDateKey(now),\n      release,");
  });
});
