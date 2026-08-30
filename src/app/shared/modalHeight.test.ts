import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Modal panels must take their height from ModalShell, not invent one.
 *
 * Six different `max-h` values had drifted across the modals, and because
 * `max-h` sizes to content a list modal grew and shrank as results came and
 * went, moving its own close button under the cursor. ModalShell now owns the
 * two heights; this fails if a caller starts hand-rolling one again.
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

describe("modal panel heights", () => {
  it("leaves the height to ModalShell", () => {
    const offenders: string[] = [];

    for (const file of walk(SRC)) {
      if (file.endsWith("ModalShell.tsx")) continue;
      const source = readFileSync(file, "utf8");

      // Only look at what a panel is told to be, not every class in the file.
      for (const match of source.matchAll(/panelClassName=(?:"([^"]*)"|\{`([^`]*)`\})/g)) {
        const classes = match[1] ?? match[2] ?? "";
        if (/(?:^|\s)(?:max-)?h-\[/.test(classes) || /(?:^|\s)max-h-/.test(classes)) {
          offenders.push(`${file.replace(SRC, "src")}: ${classes.slice(0, 70)}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
