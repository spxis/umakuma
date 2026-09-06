import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * One browser, opened from both places that may change a theme.
 *
 * The profile card was the browser for as long as the profile was the only
 * surface that could change one. It is two surfaces now, and a second copy of
 * ninety cards, a five-question quiz and a search box is exactly the pair that
 * drifts: the repo has already paid for that with fourteen hand-rolled modal
 * overlays and nineteen z-index values. So the picker and the theme page both
 * open `ThemeBrowseButton`, and neither draws a list of themes of its own.
 */
const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const SURFACES = [
  "src/app/users/[nickname]/settings/ThemePicker.tsx",
  "src/app/users/[nickname]/theme/ThemeStagesPanel.tsx",
];

describe("the theme browser", () => {
  it.each(SURFACES)("%s opens the shared browser", (path) => {
    expect(read(path)).toContain("ThemeBrowseButton");
  });

  /*
   * The tell for a second browser: a surface that maps over the choices is
   * drawing its own list rather than handing them to the modal.
   */
  it.each(SURFACES)("%s draws no theme list of its own", (path) => {
    const source = read(path);

    expect(source).not.toContain("ThemeQuestionnaire");
    expect(source).not.toMatch(/choices\.(map|filter)/);
  });

  /* And the modal is a modal: the shell owns the scrim, Escape and the lock. */
  it("builds its overlay from ModalShell rather than by hand", () => {
    const modal = read("src/app/shared/ThemeBrowserModal.tsx");

    expect(modal).toContain("ModalShell");
    expect(modal).not.toContain("fixed inset-0");
  });

  /*
   * The save is one call. Two surfaces PATCHing the same route from their own
   * copies of the fetch is how one of them ends up not redrawing the choices
   * the response came back with.
   */
  it("changes a theme through the one hook", () => {
    for (const path of [...SURFACES, "src/app/shared/ThemeBrowserModal.tsx"]) {
      expect(read(path)).not.toContain("fetch(");
    }
    expect(read("src/app/shared/useMemberTheme.ts")).toContain("/theme`");
  });
});
