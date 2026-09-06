import { readFileSync } from "node:fs";
import { join } from "node:path";

import { JSDOM } from "jsdom";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { usePersistedEnum } from "./usePersistedEnum";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const MODES = ["grid", "list"] as const;

function Probe() {
  const [mode] = usePersistedEnum("probe:mode", MODES, "grid");
  return <span>{mode}</span>;
}

/**
 * A stored choice must not decide the first render.
 *
 * Seeding `useState` from `localStorage` looks obvious and is a hydration bug:
 * the initialiser does not run on the server, so the server renders the
 * fallback and the client's first render - which *is* hydration - renders the
 * stored value. React logs "Hydration failed because the server rendered HTML
 * didn't match" and throws the tree away, on every load, for anybody who had
 * ever changed the setting.
 */
describe("a persisted choice renders its fallback first", () => {
  it("renders the fallback on the server, whatever is stored", () => {
    const markup = renderToStaticMarkup(<Probe />);
    expect(new JSDOM(`<!doctype html><body>${markup}</body>`).window.document.body.textContent).toBe("grid");
  });
});

/**
 * And nothing seeds one from storage any more.
 *
 * Asserted over the sources rather than by rendering each surface: the fault
 * is a shape, twenty of them were in the tree, and a render test only covers
 * the ones somebody remembered to write. `StudySourceLibraryItemsManager` had
 * always done it correctly with an effect and is the precedent this hook
 * generalises.
 */
describe("no surface seeds state from storage", () => {
  const FILES = [
    "src/app/users/[nickname]/lists/[slug]/ListPageView.tsx",
    "src/app/lists/LiveListView.tsx",
    "src/app/shared/StudyHistoryTable.tsx",
    "src/app/news/NewsReader.tsx",
    "src/app/news/NewsKanjiOverviewPanel.tsx",
    "src/app/radicals/RadicalBrowserView.tsx",
    "src/app/users/[nickname]/grades/GradeKanjiBoard.tsx",
    "src/app/users/[nickname]/lists/StudyListCards.tsx",
    "src/app/users/[nickname]/umakuma/UmakumaLevelBoard.tsx",
    "src/app/users/[nickname]/jlpt-explorer/components/JlptExplorerContent.tsx",
    "src/app/users/[nickname]/level-explorer/components/LevelExplorerItemsGrid.tsx",
    "src/app/users/[nickname]/study-explorer/components/StudyExplorerPanel.tsx",
    "src/app/strokes/StrokeBrowserView.tsx",
  ];

  it.each(FILES)("%s reads its stored choice through the hook", (path) => {
    expect(read(path)).toContain("usePersistedEnum");
  });

  it.each(FILES)("%s seeds no useState from getStoredEnum", (path) => {
    expect(read(path)).not.toMatch(/useState<[^>]*>\(\(\) =>\s*\n?\s*getStoredEnum/);
  });

  /* The hook writes on change, so a surface doing it again is a second writer
     for one value - and the one that gets missed when a key changes. */
  it.each(FILES)("%s leaves the writing to the hook", (path) => {
    expect(read(path)).not.toContain("setStoredEnum(");
  });

  it("adopts the stored value in an effect rather than an initialiser", () => {
    const hook = read("src/lib/usePersistedEnum.ts");
    expect(hook).toContain("useState<T>(fallback)");
    expect(hook).toContain("useEffect");
  });
});
