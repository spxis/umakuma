import { describe, expect, it } from "vitest";

import { srsThemeBuckets, srsThemes, srsTheme } from "./srsThemes";

/**
 * The grouping the picker and the admin viewer both draw with.
 *
 * These assertions are about shape, not taste: a theme whose tiers do not add
 * up to nine stages, or whose buckets interleave, would draw as a ladder that
 * quietly misrepresents the SRS underneath it.
 */
describe("srsThemeBuckets", () => {
  const themes = srsThemes();

  it("covers stages 1-9 exactly once, in order, for every theme", () => {
    for (const theme of themes) {
      const stages = srsThemeBuckets(theme).flatMap((bucket) => bucket.levels.map((level) => level.level));
      expect(stages, theme.id).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    }
  });

  it("leaves level 0 out — not started is not a rank", () => {
    for (const theme of themes) {
      const stages = srsThemeBuckets(theme).flatMap((bucket) => bucket.levels.map((level) => level.level));
      expect(stages, theme.id).not.toContain(0);
    }
  });

  it("gives WaniKani its own five tiers over four, two, one, one, one", () => {
    const buckets = srsThemeBuckets(srsTheme("wanikani"));
    expect(buckets.map((bucket) => bucket.bucket)).toEqual([
      "Apprentice",
      "Guru",
      "Master",
      "Enlightened",
      "Burned",
    ]);
    expect(buckets.map((bucket) => bucket.levels.length)).toEqual([4, 2, 1, 1, 1]);
  });

  it("never runs a tier past the stages it holds", () => {
    for (const theme of themes) {
      for (const bucket of srsThemeBuckets(theme)) {
        const levels = bucket.levels.map((level) => level.level);
        const contiguous = levels.every((level, index) => index === 0 || level === levels[index - 1] + 1);
        expect(contiguous, `${theme.id} ${bucket.bucket}`).toBe(true);
      }
    }
  });

  it("splits a word reused as both a tier and a stage inside it", () => {
    /* Demon Slayer names a bucket 甲 and a stage inside it 甲 as well. Grouping
       by name rather than by consecutive run would merge that tier with any
       later one sharing the word, and the ladder would lose a rung. */
    const reused = themes.filter((theme) => {
      const buckets = srsThemeBuckets(theme);
      return new Set(buckets.map((bucket) => bucket.bucket)).size < buckets.length;
    });
    for (const theme of reused) {
      const stages = srsThemeBuckets(theme).flatMap((bucket) => bucket.levels.map((level) => level.level));
      expect(stages, theme.id).toHaveLength(9);
    }
  });
});

describe("srsStageTone", () => {
  it("gives the same colours the Study filters already use", async () => {
    /* Read as text rather than imported: importing both and comparing them
       would only prove two constants agree with themselves. The point is that
       the tone map still matches the hues a member has been reading on the
       Study page since before themes existed. */
    const { readFileSync } = await import("node:fs");
    const filters = readFileSync(
      "src/app/users/[nickname]/study-explorer/components/StudyExplorer.constants.ts",
      "utf8",
    );
    const tone = readFileSync("src/lib/srs/srsStageTone.ts", "utf8");
    for (const [bucket, hue] of [
      ["apprentice", "pink"],
      ["guru", "violet"],
      ["master", "sky"],
      ["enlightened", "amber"],
    ] as const) {
      expect(filters, `${bucket} in the Study filters`).toContain(`bg-${hue}-100`);
      expect(tone, `${bucket} in the shared tone`).toContain(`[SRS_BUCKETS.${bucket}]: "bg-${hue}-100`);
    }
  });

  it("has a tone for every stage a theme names", async () => {
    const { srsStageTone } = await import("./srsStageTone");
    for (let stage = 0; stage <= 9; stage += 1) {
      expect(srsStageTone(stage), `stage ${stage}`).toMatch(/^bg-/);
    }
  });
});
