/**
 * Builds every file in public/assets/currency/ from the masters in
 * src/images/currency/.
 *
 *   pnpm currency:build
 *
 * A master is one 128x128 SVG: a character (mochi, oni, kane) or a reaction
 * of one (mochi-laugh, kane-party). From each the script writes the family the
 * first three shipped with, so a reaction is as usable as the icon it belongs
 * to:
 *
 *   <name>.svg              the master, with build annotations stripped
 *   <name>-dark.svg         outline lifted for dark surfaces
 *   <name>-<S>.svg          S in 18 24 32 48 64: optical size variants
 *   <name>-<S>-dark.svg
 *   <name>-<P>.png          P in 128 256 512 1024 2048: transparent renders
 *
 * Optical sizes thicken strokes so a face still reads when the whole drawing
 * is eighteen pixels wide, and drop details the master marks with
 * `data-min-size="32"` (the attribute is removed from the output). The rule
 * is one of legibility floors on the on-screen stroke, not a fixed multiplier:
 * a 7-unit outline at 18px is 1px on screen and gets lifted to 1.8px, while
 * at 64px it is already 3.5px and is left alone.
 *
 * The output directory is owned: a file there that no master produces is
 * deleted, so a renamed or withdrawn master cannot leave an orphan behind.
 * Hand-edit the masters, never the outputs.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { JSDOM } from "jsdom";
import { chromium } from "@playwright/test";

const MASTERS_DIR = path.resolve("src/images/currency");
const OUTPUT_DIR = path.resolve("public/assets/currency");

const OPTICAL_SIZES = [18, 24, 32, 48, 64];
const PNG_SIZES = [128, 256, 512, 1024, 2048];
const VIEWBOX = 128;

/** The outline brown, and the lighter brown the dark variants use instead. */
const OUTLINE_COLOR = "#4B372B";
const OUTLINE_COLOR_DARK = "#6A5243";

/**
 * Interior lines that are meant to sit back: Kane's rings and the Oni horn
 * stripes. They get a lower floor so they stay quieter than the face.
 */
const DETAIL_COLORS = new Set(["#C88710", "#D9960F"]);

/**
 * Minimum on-screen stroke width in CSS pixels at 18px, and how fast the floor
 * rises with size. At 18px these three floors reproduce the shipped v11
 * variants exactly (12.8 on the outline, 12.09 on a 4.8 face stroke, 6 on a
 * 4.32 ring); above that the floor climbs gently so 48 and 64 stay close to
 * the master's own weights.
 */
const STROKE_FLOORS = {
  outline: { px: 1.8, growth: 0.5 },
  face: { px: 1.7, growth: 0.35 },
  detail: { px: 0.85, growth: 0.35 },
};

const MIN_SIZE_ATTR = "data-min-size";

function parseScale(transform) {
  if (!transform) return 1;
  const match = /scale\(\s*([-\d.eE]+)(?:[\s,]+([-\d.eE]+))?\s*\)/.exec(transform);
  if (!match) return 1;
  const sx = Number(match[1]);
  const sy = match[2] === undefined ? sx : Number(match[2]);
  return Math.sqrt(Math.abs(sx * sy));
}

/** Product of every scale() from the element up to the root. */
function cumulativeScale(element) {
  let scale = 1;
  for (let node = element; node && node.nodeType === 1; node = node.parentNode) {
    scale *= parseScale(node.getAttribute("transform"));
  }
  return scale;
}

function strokeClass(element) {
  const stroke = (element.getAttribute("stroke") ?? "").toUpperCase();
  if (stroke === OUTLINE_COLOR || stroke === OUTLINE_COLOR_DARK) return "outline";
  if (DETAIL_COLORS.has(stroke)) return "detail";
  return "face";
}

function floorFor(kind, size) {
  const { px, growth } = STROKE_FLOORS[kind];
  return px * (size / 18) ** growth;
}

function formatNumber(value) {
  return String(Math.round(value * 1000) / 1000);
}

function loadSvg(source) {
  const dom = new JSDOM(source, { contentType: "image/svg+xml" });
  return { dom, document: dom.window.document, root: dom.window.document.documentElement };
}

function serialize(document) {
  return `${document.documentElement.outerHTML}\n`;
}

function stripAnnotations(document) {
  for (const element of document.querySelectorAll(`[${MIN_SIZE_ATTR}]`)) {
    element.removeAttribute(MIN_SIZE_ATTR);
  }
}

function toDark(source) {
  return source.replaceAll(OUTLINE_COLOR, OUTLINE_COLOR_DARK);
}

function buildOpticalSize(source, size) {
  const { document, root } = loadSvg(source);
  root.setAttribute("width", String(size));
  root.setAttribute("height", String(size));

  for (const element of [...document.querySelectorAll(`[${MIN_SIZE_ATTR}]`)]) {
    if (Number(element.getAttribute(MIN_SIZE_ATTR)) > size) element.remove();
  }

  for (const element of document.querySelectorAll("[stroke-width]")) {
    const width = Number(element.getAttribute("stroke-width"));
    if (!Number.isFinite(width) || width <= 0) continue;
    const onScreen = (width * cumulativeScale(element) * size) / VIEWBOX;
    const floor = floorFor(strokeClass(element), size);
    if (onScreen < floor) {
      element.setAttribute("stroke-width", formatNumber((width * floor) / onScreen));
    }
  }

  stripAnnotations(document);
  return serialize(document);
}

function buildMaster(source) {
  const { document } = loadSvg(source);
  stripAnnotations(document);
  return serialize(document);
}

function expectedFiles(name) {
  const files = [`${name}.svg`, `${name}-dark.svg`];
  for (const size of OPTICAL_SIZES) files.push(`${name}-${size}.svg`, `${name}-${size}-dark.svg`);
  for (const size of PNG_SIZES) files.push(`${name}-${size}.png`);
  return files;
}

async function renderPngs(page, name, source) {
  const dataUrl = `data:image/svg+xml;base64,${Buffer.from(source).toString("base64")}`;
  for (const size of PNG_SIZES) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(
      `<html><body style="margin:0;background:transparent"><img src="${dataUrl}" width="${size}" height="${size}" style="display:block"></body></html>`,
    );
    await page.screenshot({ path: path.join(OUTPUT_DIR, `${name}-${size}.png`), omitBackground: true });
  }
}

async function main() {
  const masterFiles = (await fs.readdir(MASTERS_DIR)).filter((file) => file.endsWith(".svg")).sort();
  if (masterFiles.length === 0) throw new Error(`No masters in ${MASTERS_DIR}`);

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  const produced = new Set();

  try {
    for (const file of masterFiles) {
      const name = path.basename(file, ".svg");
      const source = await fs.readFile(path.join(MASTERS_DIR, file), "utf8");
      const master = buildMaster(source);

      await fs.writeFile(path.join(OUTPUT_DIR, `${name}.svg`), master);
      await fs.writeFile(path.join(OUTPUT_DIR, `${name}-dark.svg`), toDark(master));
      for (const size of OPTICAL_SIZES) {
        const sized = buildOpticalSize(source, size);
        await fs.writeFile(path.join(OUTPUT_DIR, `${name}-${size}.svg`), sized);
        await fs.writeFile(path.join(OUTPUT_DIR, `${name}-${size}-dark.svg`), toDark(sized));
      }
      await renderPngs(page, name, master);

      for (const produced_file of expectedFiles(name)) produced.add(produced_file);
      console.log(`built ${name} (${expectedFiles(name).length} files)`);
    }
  } finally {
    await browser.close();
  }

  const stale = (await fs.readdir(OUTPUT_DIR)).filter((file) => !produced.has(file));
  for (const file of stale) {
    await fs.rm(path.join(OUTPUT_DIR, file));
    console.log(`removed stale ${file}`);
  }

  console.log(`${masterFiles.length} masters -> ${produced.size} files in ${path.relative(process.cwd(), OUTPUT_DIR)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
