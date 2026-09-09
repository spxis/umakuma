/**
 * The link preview card, built rather than drawn.
 *
 * A UmaKuma URL pasted into iMessage, Slack, Discord or X had no image, so it
 * arrived as a line of grey text. Next emits `og:image` and `twitter:image`
 * from a file named `opengraph-image` in `src/app/`, so the whole feature is
 * one 1200x630 PNG sitting in the right place.
 *
 * Rendered through Chromium rather than composited, because the card is mostly
 * type and type is what an image library is worst at. The page below is the
 * card: change it, run `pnpm og:build`, commit the PNG.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { chromium } from "@playwright/test";

/** Open Graph's own recommendation, and what every reader crops to. */
const WIDTH = 1200;
const HEIGHT = 630;

const ROOT = process.cwd();
const HERO = path.join(ROOT, "src/images/umakuma-hero1-transparent.png");
/*
 * Two files, not one. `opengraph-image` emits only the `og:image` tags;
 * `twitter-image` is its own file convention and emits `twitter:image`. X does
 * fall back to `og:image`, but the fallback is theirs to change and the card
 * is the same picture either way.
 */
const OUTPUTS = ["opengraph-image", "twitter-image"].map((name) => path.join(ROOT, `src/app/${name}.png`));
const ALT = "Uma the horse and Kuma the bear over the UmaKuma wordmark, beside the words: Learn the kanji together.";

/* Straight from BRAND_CORE.md. Named here so a drift shows up as a diff. */
const SKY = "#EEF4FF";
const NAVY = "#16223A";
const BLUE = "#2D7CFF";
const CORAL = "#FF5D73";

function dataUri(file: string): string {
  return `data:image/png;base64,${readFileSync(file).toString("base64")}`;
}

const html = `<!doctype html>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: ${WIDTH}px; height: ${HEIGHT}px; display: flex; align-items: center;
    gap: 56px; padding: 0 72px; background: ${SKY};
    font-family: "Nunito", "Trebuchet MS", "Segoe UI", system-ui, sans-serif;
    color: ${NAVY}; overflow: hidden;
  }
  /* A band of brand colour down the left edge, so the card still reads as ours
     in a feed that has stripped everything else to a thumbnail. */
  .edge { position: fixed; inset: 0 auto 0 0; width: 18px; background: ${BLUE}; }
  .edge::after { content: ""; position: absolute; inset: auto 0 0 0; height: 33%; background: ${CORAL}; }
  .words { flex: 1 1 auto; min-width: 0; }
  /* No typographic wordmark here. The art already carries one, drawn, and
     setting the name again put "UmaKuma" on the card twice. Every reader
     prints the page title beside the image anyway, so the name is never
     missing - what the card owes is the promise. */
  p { font-size: 58px; font-weight: 900; letter-spacing: -0.02em; line-height: 1.14; color: ${NAVY}; }
  p .blue { color: ${BLUE}; }
  .rule { margin-top: 34px; width: 148px; height: 12px; border-radius: 999px; background: ${CORAL}; }
  /* The source art carries the wordmark under the heads, and the card
     already sets the name in type. Showing both put "UmaKuma" on the card
     twice, so the art is clipped to the pair. */
  .art { flex: 0 0 auto; width: 560px; }
  .art img { width: 560px; height: auto; display: block; }
</style>
<div class="edge"></div>
<div class="words">
  <p>Learn the kanji<br><span class="blue">together</span>.</p>
  <div class="rule"></div>
</div>
<div class="art"><img src="${dataUri(HERO)}" alt=""></div>
`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: "load" });
await page.waitForTimeout(300);
const shot = await page.screenshot({ type: "png", clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT } });
await browser.close();

for (const out of OUTPUTS) {
  writeFileSync(out, shot);
  writeFileSync(out.replace(/\.png$/, ".alt.txt"), ALT);
  const header = readFileSync(out);
  console.log(`wrote ${path.relative(ROOT, out)} ${header.readUInt32BE(16)}x${header.readUInt32BE(20)} ${(header.length / 1024) | 0}KB`);
}
