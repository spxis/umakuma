import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/*
 * The tab icon, the bookmark icon and the home-screen tile are files Next.js
 * picks up by name from this directory. For a year the favicon was the
 * starter's black circle with a white triangle, and nothing noticed because
 * nothing looked. These read the files' own headers so a regenerated icon
 * that came out the wrong size, or a starter file put back by a scaffold,
 * fails here.
 */
const APP_DIR = __dirname;

function pngSize(file: string): { width: number; height: number } {
  const bytes = readFileSync(path.join(APP_DIR, file));
  expect(bytes.subarray(0, 8).toString("hex"), `${file} is a PNG`).toBe("89504e470d0a1a0a");
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

describe("the app icons", () => {
  it("ships a favicon with 16, 32 and 48 pixel entries", () => {
    const ico = readFileSync(path.join(APP_DIR, "favicon.ico"));
    expect(ico.readUInt16LE(2), "ICO type").toBe(1);
    const count = ico.readUInt16LE(4);
    const sizes = [];
    for (let i = 0; i < count; i += 1) {
      const entry = 6 + 16 * i;
      const size = ico.readUInt8(entry) || 256;
      const offset = ico.readUInt32LE(entry + 12);
      expect(ico.subarray(offset, offset + 8).toString("hex"), `entry ${size} is a PNG`).toBe("89504e470d0a1a0a");
      sizes.push(size);
    }
    expect(sizes).toEqual([16, 32, 48]);
  });

  it("ships a 512 pixel icon for bookmarks and a 180 pixel tile for iOS", () => {
    expect(pngSize("icon.png")).toEqual({ width: 512, height: 512 });
    expect(pngSize("apple-icon.png")).toEqual({ width: 180, height: 180 });
  });
});

/*
 * The link preview card. A UmaKuma URL pasted into iMessage, Slack, Discord or
 * X showed a line of grey text until this existed, and the failure is silent:
 * nothing on the site looks wrong, the card is just poor somewhere else. Both
 * files are built by `pnpm og:build` from `scripts/og-build.mts`.
 */
describe("the link preview card", () => {
  /* 1200x630 is Open Graph's own recommendation and what every reader crops
     to. A card built at the wrong size is letterboxed or cut, and only ever
     seen off-site. */
  it("ships an Open Graph and a Twitter card at 1200x630", () => {
    expect(pngSize("opengraph-image.png")).toEqual({ width: 1200, height: 630 });
    expect(pngSize("twitter-image.png")).toEqual({ width: 1200, height: 630 });
  });

  /* Two files because `opengraph-image` emits only the og: tags; twitter-image
     is its own convention. They are the same picture and must stay so. */
  it("draws the same picture on both", () => {
    const og = readFileSync(path.join(APP_DIR, "opengraph-image.png"));
    const twitter = readFileSync(path.join(APP_DIR, "twitter-image.png"));

    expect(twitter.equals(og)).toBe(true);
  });

  /* X refuses a card over 5MB and Facebook over 8MB, and a build that trips
     either fails rather than warns. */
  it("stays inside the size a reader will accept", () => {
    const bytes = readFileSync(path.join(APP_DIR, "opengraph-image.png")).length;

    expect(bytes).toBeLessThan(5 * 1024 * 1024);
  });

  it("describes itself for a reader who cannot see it", () => {
    for (const file of ["opengraph-image.alt.txt", "twitter-image.alt.txt"]) {
      const alt = readFileSync(path.join(APP_DIR, file), "utf8").trim();
      expect(alt.length, `${file} says something`).toBeGreaterThan(20);
      expect(alt).toMatch(/UmaKuma/);
    }
  });
});
