#!/usr/bin/env node
/**
 * Builds the radical glyph font.
 *
 * Fifteen of WaniKani's 504 radicals arrive from the API with `characters`
 * empty. WaniKani draws those as artwork on its own CDN, which is access
 * gated and is its copyright either way, so the site had nothing to show and
 * fell back to printing the English slug - a review of 旅 asked the member to
 * recognise the word "tofu".
 *
 * Nine of the fifteen are real Unicode characters that WaniKani simply never
 * filled in. The other six are shapes Unicode does not encode at all: they
 * exist in the CHISE IDS database only as private CDP codes, or (like Hills)
 * not even that. Those six take private-use codepoints here.
 *
 * Every glyph is carved out of Noto Sans JP rather than drawn, which is what
 * makes this honest: the shapes are already in the font as parts of ordinary
 * kanji, so Hills is 之 with its top stroke removed and Cactus is the bottom
 * of 虚. Carving also keeps the fifteen in the same voice as the site's
 * default Japanese face, because it *is* that face - a mincho source would
 * have put serifs on three percent of the radicals and nothing else.
 *
 * The contour indices below are positional, so they are pinned to the version
 * of Noto Sans JP this script downloads. If the upstream font is redrawn the
 * carve has to be re-checked against `radical-font-proof.html`, which this
 * script writes beside the font for exactly that purpose.
 *
 * Source: Noto Sans JP, Google, SIL Open Font License 1.1. The OFL permits
 * subsetting and modification; the licence and its reserved-name rule ride in
 * the generated directory beside the font.
 *
 * Usage: pnpm radicals:font
 */

import fs from "node:fs/promises";
import path from "node:path";
import * as fontkit from "fontkit";
import opentype from "opentype.js";
import wawoff2 from "wawoff2";

const SOURCE_URL =
  "https://raw.githubusercontent.com/google/fonts/main/ofl/notosansjp/NotoSansJP%5Bwght%5D.ttf";
const OUT_DIR = path.join(process.cwd(), "public", "fonts");
const CACHE = path.join(process.cwd(), "node_modules", ".cache", "notosansjp.ttf");

/**
 * Where the private-use block starts. These six shapes have no Unicode
 * character, so nothing but this font can render them; the resolver in
 * `src/lib/radicalGlyphs.ts` is the only thing that emits them.
 */
export const PRIVATE_USE_BASE = 0xe000;

/**
 * slug -> how to build the glyph.
 *
 * `from` is the kanji to carve out of and `keep` the contours of that glyph
 * which make up the radical, indexed in the order opentype.js reports them.
 * `codepoint` is the real Unicode character where one exists, and null where
 * the shape is unencoded - those are assigned private-use codepoints in order.
 */
const GLYPHS = [
  { slug: "beggar", codepoint: 0x4e02, from: "丂", keep: null },
  { slug: "satellite", codepoint: 0x4343, from: "䍃", keep: null },
  { slug: "rib-cage", codepoint: 0x9fb6, from: "表", keep: [0, 1, 2, 3] },
  { slug: "death-star", codepoint: 0x4fde, from: "輸", keep: [0, 1, 2, 3, 4, 5, 6, 7] },
  { slug: "cactus", codepoint: 0x4e1a, from: "虚", keep: [2, 4, 5, 10, 11] },
  { slug: "kick", codepoint: 0x27607, from: "衣", keep: [1, 2, 4, 5, 6] },
  { slug: "pope", codepoint: 0x250ed, from: "盾", keep: [0, 1, 2, 3, 6, 7] },
  { slug: "creeper", codepoint: 0x20b9b, from: "司", keep: [1, 3, 4] },
  { slug: "elf", codepoint: 0x24bba, from: "敢", keep: [0, 1, 2, 3, 4, 5, 6, 7] },
  { slug: "yurt", codepoint: null, from: "度", keep: [0, 2, 5, 6, 7] },
  { slug: "tofu", codepoint: null, from: "派", keep: [0, 2, 4, 5] },
  { slug: "explosion", codepoint: null, from: "渋", keep: [0, 5, 6, 7] },
  { slug: "comb", codepoint: null, from: "印", keep: [0, 1, 3, 4] },
  { slug: "hills", codepoint: null, from: "之", keep: [0, 2, 3, 4] },
  {
    slug: "psychopath",
    codepoint: null,
    from: "鬱",
    keep: [10, 11, 12, 13, 14, 15, 16, 18, 19, 20, 21, 22, 23],
  },
];

/**
 * The weights the font ships.
 *
 * Noto Sans JP is variable and its `wght` axis defaults to 100 - Thin - so an
 * uninstanced read produces hairlines. The review modal draws its glyph at
 * `font-black`, and a single-weight face cannot answer `font-weight`, so the
 * fifteen would sit visibly lighter than the kanji beside them. Two faces let
 * the browser pick.
 */
const WEIGHTS = [
  { weight: 400, suffix: "regular" },
  { weight: 900, suffix: "black" },
];

/** fontkit path commands -> opentype.js path commands. */
function toOpentypeCommands(commands) {
  return commands.map(({ command, args }) => {
    if (command === "moveTo") return { type: "M", x: args[0], y: args[1] };
    if (command === "lineTo") return { type: "L", x: args[0], y: args[1] };
    if (command === "quadraticCurveTo") return { type: "Q", x1: args[0], y1: args[1], x: args[2], y: args[3] };
    if (command === "bezierCurveTo")
      return { type: "C", x1: args[0], y1: args[1], x2: args[2], y2: args[3], x: args[4], y: args[5] };
    return { type: "Z" };
  });
}

/** Splits a command list into contours, each starting at its own move. */
function toContours(commands) {
  const contours = [];
  let current = null;
  for (const command of commands) {
    if (command.type === "M") {
      current = [command];
      contours.push(current);
      continue;
    }
    if (current) current.push(command);
  }
  return contours;
}

function boundsOf(commands) {
  const xs = [];
  const ys = [];
  for (const command of commands) {
    for (const key of ["x", "x1", "x2"]) if (command[key] !== undefined) xs.push(command[key]);
    for (const key of ["y", "y1", "y2"]) if (command[key] !== undefined) ys.push(command[key]);
  }
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
}

/**
 * Scales a carved shape back up to fill the em square.
 *
 * Without this a carved radical keeps the position and size it had inside its
 * parent kanji, so Hills would render as a small mark in the lower left of an
 * otherwise empty box. Radicals are shown at the same size as kanji across the
 * site, so each one is fitted to the same target box that a full character
 * occupies.
 */
function normalize(commands, unitsPerEm) {
  const target = unitsPerEm * 0.86;
  const padBottom = unitsPerEm * -0.06;
  const bounds = boundsOf(commands);
  const width = bounds.x1 - bounds.x0;
  const height = bounds.y1 - bounds.y0;
  const scale = Math.min(target / Math.max(width, 1), target / Math.max(height, 1));
  const dx = (unitsPerEm - width * scale) / 2 - bounds.x0 * scale;
  const dy = padBottom + (target - height * scale) / 2 - bounds.y0 * scale;

  return commands.map((command) => {
    const next = { ...command };
    for (const key of ["x", "x1", "x2"]) if (next[key] !== undefined) next[key] = next[key] * scale + dx;
    for (const key of ["y", "y1", "y2"]) if (next[key] !== undefined) next[key] = next[key] * scale + dy;
    return next;
  });
}

async function loadSource() {
  try {
    return await fs.readFile(CACHE);
  } catch {
    console.log(`Fetching ${SOURCE_URL}`);
    const response = await fetch(SOURCE_URL);
    if (!response.ok) throw new Error(`Noto Sans JP fetch failed: ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.mkdir(path.dirname(CACHE), { recursive: true });
    await fs.writeFile(CACHE, buffer);
    return buffer;
  }
}

async function main() {
  const source = await loadSource();
  const variable = fontkit.create(source);
  const unitsPerEm = variable.unitsPerEm;

  await fs.mkdir(OUT_DIR, { recursive: true });
  let manifest = [];
  const sizes = [];

  for (const { weight, suffix } of WEIGHTS) {
    const font = variable.getVariation({ wght: weight });
    const glyphs = [
      new opentype.Glyph({ name: ".notdef", unicode: 0, advanceWidth: unitsPerEm, path: new opentype.Path() }),
    ];
    manifest = [];
    let privateUse = PRIVATE_USE_BASE;

    for (const spec of GLYPHS) {
      const [sourceGlyph] = font.glyphsForString(spec.from);
      if (!sourceGlyph) throw new Error(`${spec.slug}: source ${spec.from} missing from font`);
      const all = toOpentypeCommands(sourceGlyph.path.commands);

      let commands;
      if (spec.keep === null) {
        commands = all;
      } else {
        const contours = toContours(all);
        for (const index of spec.keep) {
          if (!contours[index]) {
            throw new Error(`${spec.slug}: ${spec.from} has no contour #${index} - the source font changed`);
          }
        }
        commands = normalize(spec.keep.flatMap((index) => contours[index]), unitsPerEm);
      }

      const codepoint = spec.codepoint ?? privateUse++;
      const glyphPath = new opentype.Path();
      glyphPath.commands = commands;
      glyphs.push(
        new opentype.Glyph({ name: `radical-${spec.slug}`, unicode: codepoint, advanceWidth: unitsPerEm, path: glyphPath }),
      );
      manifest.push({ slug: spec.slug, codepoint, encoded: spec.codepoint !== null, from: spec.from });
    }

    const built = new opentype.Font({
      familyName: "UmaKuma Radicals",
      styleName: suffix === "black" ? "Black" : "Regular",
      unitsPerEm,
      ascender: variable.ascent,
      descender: variable.descent,
      glyphs,
    });
    const ttf = Buffer.from(built.toArrayBuffer());
    const woff2 = Buffer.from(await wawoff2.compress(ttf));
    await fs.writeFile(path.join(OUT_DIR, `umakuma-radicals-${suffix}.woff2`), woff2);
    sizes.push(`${suffix} ${(woff2.length / 1024).toFixed(1)}KB`);
  }

  await fs.writeFile(
    path.join(OUT_DIR, "umakuma-radicals.json"),
    `${JSON.stringify({ source: "Noto Sans JP", licence: "SIL Open Font License 1.1", licenceUrl: "https://openfontlicense.org", weights: WEIGHTS.map((w) => w.weight), glyphs: manifest }, null, 2)}\n`,
  );

  /*
   * The slug -> glyph map the site reads. Generated here rather than typed by
   * hand so the font and the resolver cannot drift: a codepoint that moves in
   * GLYPHS moves in both places at once.
   */
  const DATA_DIR = path.join(process.cwd(), "src", "data", "radicals");
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(
    path.join(DATA_DIR, "glyphs.json"),
    `${JSON.stringify(
      {
        attribution: { source: "Noto Sans JP", licence: "SIL Open Font License 1.1" },
        privateUseRange: [
          `U+${PRIVATE_USE_BASE.toString(16).toUpperCase()}`,
          `U+${(PRIVATE_USE_BASE + manifest.filter((m) => !m.encoded).length - 1).toString(16).toUpperCase()}`,
        ],
        glyphs: Object.fromEntries(
          manifest.map((entry) => [entry.slug, { glyph: String.fromCodePoint(entry.codepoint), encoded: entry.encoded }]),
        ),
      },
      null,
      2,
    )}\n`,
  );

  const rows = manifest
    .map(
      (entry) =>
        `<figure><span class="b">&#${entry.codepoint};</span><span class="r">&#${entry.codepoint};</span>` +
        `<figcaption>${entry.slug}<br><small>U+${entry.codepoint
          .toString(16)
          .toUpperCase()}${entry.encoded ? "" : " (private)"} · from ${entry.from}</small></figcaption></figure>`,
    )
    .join("\n");
  await fs.writeFile(
    path.join(OUT_DIR, "radical-font-proof.html"),
    `<!doctype html><meta charset="utf-8"><title>Radical glyph proof</title>
<style>
@font-face{font-family:"UmaKuma Radicals";font-weight:400;src:url("./umakuma-radicals-regular.woff2") format("woff2");}
@font-face{font-family:"UmaKuma Radicals";font-weight:900;src:url("./umakuma-radicals-black.woff2") format("woff2");}
body{font-family:system-ui,sans-serif;background:#fff;color:#111;margin:24px}
main{display:grid;grid-template-columns:repeat(5,1fr);gap:16px}
figure{margin:0;text-align:center;border:1px solid #ddd;border-radius:8px;padding:12px;display:flex;flex-direction:column;align-items:center}
span{font-family:"UmaKuma Radicals";font-size:64px;line-height:1.05;display:block}
.b{font-weight:900}
.r{font-weight:400;font-size:34px;color:#666}
figcaption{font-size:12px;color:#555;margin-top:8px}
</style><main>\n${rows}\n</main>\n`,
  );

  console.log(`Wrote ${manifest.length} glyphs (${manifest.filter((m) => !m.encoded).length} private-use) to ${OUT_DIR}`);
  console.log(`  ${sizes.join(", ")} — proof sheet: public/fonts/radical-font-proof.html`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
