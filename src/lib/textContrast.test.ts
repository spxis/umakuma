import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Text a member can actually read.
 *
 * Everything here is measured against the WCAG AA floor for body text, 4.5:1.
 * Two things were under it across the whole app, and neither was a mistake
 * anyone would spot by looking - low-contrast grey reads as "muted" to the
 * person who chose it and as "missing" to the person who cannot see it.
 *
 * These are guards, not a general checker: they hold the two decisions that
 * were made, so the next person to type `text-foreground/45` finds out here.
 */

const SRC = join(process.cwd(), "src");
const CSS = join(SRC, "app/globals.css");

/* --- the small amount of colour maths the assertions need --- */

type Rgb = [number, number, number];

function hexToRgb(hex: string): Rgb {
  const value = hex.replace("#", "");
  return [0, 2, 4].map((i) => Number.parseInt(value.slice(i, i + 2), 16)) as Rgb;
}

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance([r, g, b]: Rgb): number {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** `percent` of `fg` composited over `bg`, which is what a `/60` opacity does. */
function mix(fg: Rgb, bg: Rgb, percent: number): Rgb {
  return fg.map((c, i) => Math.round((c * percent) / 100 + (bg[i] * (100 - percent)) / 100)) as Rgb;
}

function cssVar(name: string): string {
  const match = readFileSync(CSS, "utf8").match(new RegExp(`\\n\\s*--${name}:\\s*(#[0-9a-f]{6})`, "i"));
  expect(match?.[1], `--${name} should be defined in globals.css`).toBeTruthy();
  return match![1];
}

const AA_BODY = 4.5;

/**
 * Where faintness is the meaning, not an oversight.
 *
 * WCAG's floor is for text a member has to read. It does not cover a disabled
 * control, an inactive state, or a mark that is decoration rather than content
 * - and darkening those actively misleads: a greyed corner the round is not
 * using would start to look available, and a completion that has not been
 * accepted yet would look typed.
 *
 * Every entry is a whole file, so anything genuinely readable in one of these
 * has to be caught by eye. Keep the list short for that reason.
 */
const FAINT_ON_PURPOSE: Record<string, string> = {
  "src/app/game/GameCornersBoard.tsx":
    "The key hint on a greyed placeholder corner the round is not using. Darkening it would make an unused corner look playable.",
  "src/app/shared/SearchComboboxField.tsx":
    "The ghost completion, which must read as not-yet-typed. At full contrast it is indistinguishable from what the member typed.",
  "src/app/shared/KanjiStrokeAnimation.tsx":
    "The finished glyph, drawn behind the strokes as a guide to trace over. It is the backdrop, not something to read.",
  "src/app/shared/AppTopMenuRow.tsx": "The | between nav links. A separator, not content.",
  "src/app/users/[nickname]/UserHeaderMenu.tsx": "The | between menu entries. A separator, not content.",
  "src/app/releases/page.tsx": "The disclosure chevron; the summary beside it carries the meaning.",
  "src/app/admin/releases/ReleaseTimelineList.tsx": "The disclosure chevron, as above.",
  "src/app/search/RecentSearches.tsx": "The history icon in the glyph lane, not text.",
  "src/app/shared/SurfacePagination.tsx": "The disabled first/prev/next buttons. Disabled controls are exempt.",
  "src/app/users/[nickname]/shared/GlyphTagOverlay.tsx":
    "An untagged trouble or favourite mark - the off state of a toggle, which has to look off.",
  "src/app/users/[nickname]/study-explorer/components/StudyExplorerRows.tsx":
    "The inactive sort arrow, which rises to /60 on hover.",
};

function sourceFiles(): string[] {
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.tsx?$/.test(name)) found.push(full);
    }
  };
  walk(SRC);
  return found;
}

describe("muted text stays above the floor", () => {
  /*
   * `text-foreground/45` was on 751 nodes at 3.07:1. The lowest step that
   * clears 4.5 against both the white surface and the page background is /60,
   * so that is the floor - and /55, at 4.19, is genuinely not enough rather
   * than nearly enough.
   */
  it("has no foreground opacity below the readable step", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles()) {
      const relative = file.replace(`${process.cwd()}/`, "");
      if (relative in FAINT_ON_PURPOSE || relative === "src/lib/textContrast.test.ts") continue;

      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(/text-foreground\/(\d+)/g)) {
        if (Number(match[1]) < 60) {
          offenders.push(`${relative}: ${match[0]}`);
        }
      }
    }

    expect(
      offenders,
      "muted text below /60 falls under 4.5:1 - raise it to text-foreground/60, or add the file to FAINT_ON_PURPOSE with the reason",
    ).toEqual([]);
  });

  /* An exemption that stops being true should stop being listed. */
  it.each(Object.keys(FAINT_ON_PURPOSE))("%s still has something faint in it", (file) => {
    const source = readFileSync(join(process.cwd(), file), "utf8");
    const faint = [...source.matchAll(/text-foreground\/(\d+)/g)].some((m) => Number(m[1]) < 60);
    expect(faint, `${file} is exempt but has nothing under /60 - drop it from the list`).toBe(true);
  });

  it("proves /60 clears the floor and /55 does not", () => {
    const foreground = hexToRgb(cssVar("foreground"));
    for (const surface of [cssVar("surface"), cssVar("background")]) {
      const ground = hexToRgb(surface);
      expect(contrastRatio(mix(foreground, ground, 60), ground)).toBeGreaterThanOrEqual(AA_BODY);
      expect(contrastRatio(mix(foreground, ground, 55), ground)).toBeLessThan(AA_BODY);
    }
  });
});

/*
 * The subject colours are the brand, so they are not darkened - a second token
 * is, and only text uses it. The pills read the `-text` variant while every
 * glyph, border and fill still reads the original.
 */
describe("subject pills are readable without repainting the brand", () => {
  const subjects = ["radical", "kanji", "vocabulary"] as const;

  it.each(subjects)("%s pill text clears 4.5:1 on its own tint", (subject) => {
    const brand = hexToRgb(cssVar(subject));
    const text = hexToRgb(cssVar(`${subject}-text`));
    /* The pill background is the brand at 10% over white. */
    const tint = mix(brand, [255, 255, 255], 10);

    expect(contrastRatio(text, tint)).toBeGreaterThanOrEqual(AA_BODY);
  });

  it.each(subjects)("%s keeps its brand colour for everything that is not text", (subject) => {
    const css = readFileSync(CSS, "utf8");
    const rule = css.slice(css.indexOf(`.subject-pill--${subject}`));
    const body = rule.slice(0, rule.indexOf("}"));

    expect(body, "the label should use the darker text token").toContain(`color: var(--${subject}-text)`);
    expect(body, "the border should still be the brand colour").toContain(
      `border-color: color-mix(in srgb, var(--${subject}) 45%`,
    );
    expect(body, "the tint should still be the brand colour").toContain(
      `background: color-mix(in srgb, var(--${subject}) 10%`,
    );
  });

  /* The point of the split: the brand values themselves must not have moved. */
  it("leaves the brand palette exactly as it was", () => {
    expect(cssVar("radical")).toBe("#10b4e8");
    expect(cssVar("kanji")).toBe("#ff3b82");
    expect(cssVar("vocabulary")).toBe("#8b5cf6");
  });
});
