import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * A near-viewport-wide dropdown may not be right-anchored on a phone.
 *
 * The study queue menu is `w-[min(100vw-2rem,26rem)]`. It was given the Mode
 * menu's `right-0` to stop it running off the right on desktop, but the Mode
 * menu is `w-64` and fits beside its button while this one does not: anchoring
 * a panel as wide as the screen to a button that is not at the right edge puts
 * its left edge off the display, which is exactly what shipped.
 *
 * So a panel sized in `100vw` must anchor left by default and only flip to
 * `right-0` behind a breakpoint prefix.
 */

const SRC = join(process.cwd(), "src");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (full.endsWith(".tsx")) out.push(full);
  }
  return out;
}

/** Class lists that position something absolutely and size it against the viewport. */
function viewportWidePanels(source: string): string[] {
  const found: string[] = [];
  for (const match of source.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)) {
    const classes = match[1] ?? match[2] ?? "";
    if (/(?:^|\s)absolute(?:\s|$)/.test(classes) && classes.includes("100vw")) {
      found.push(classes);
    }
  }
  return found;
}

describe("viewport-wide dropdown anchoring", () => {
  it("anchors left on a phone and flips to the right only at a breakpoint", () => {
    const offenders: string[] = [];

    for (const file of walk(SRC)) {
      for (const classes of viewportWidePanels(readFileSync(file, "utf8"))) {
        // An unprefixed `right-0` is the bug: it applies at every width.
        if (/(?:^|\s)right-0(?:\s|$)/.test(classes)) {
          offenders.push(`${file.replace(SRC, "src")}: ${classes.slice(0, 80)}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
