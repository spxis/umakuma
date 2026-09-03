import { JSDOM } from "jsdom";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import ExplorerStudyModeMenu from "./ExplorerStudyModeMenu";
import { STUDY_MODE_BEHAVIOR_OPTIONS, STUDY_MODE_OFF_OPTION } from "./explorerStudyMode";

/*
 * The menu is closed until hovered or clicked, and this renders statically, so
 * the entries are read out of the markup the open state would produce. The
 * button itself is what the closed menu shows.
 */
function draw(studyMode: boolean): Document {
  const markup = renderToStaticMarkup(
    <ExplorerStudyModeMenu
      studyMode={studyMode}
      studyModeBehavior="session"
      onSelectMode={() => undefined}
      onTurnOff={() => undefined}
    />,
  );
  return new JSDOM(`<!doctype html><body>${markup}</body>`).window.document;
}

describe("the study mode button", () => {
  /*
   * It has always drawn an off state and there was no way to reach it: every
   * entry in the menu chose a behaviour, and every behaviour turns study mode
   * on.
   */
  it("draws differently when study mode is off", () => {
    const on = draw(true).querySelector("button")?.getAttribute("class") ?? "";
    const off = draw(false).querySelector("button")?.getAttribute("class") ?? "";
    expect(on).not.toBe(off);
    expect(on).toContain("bg-hot");
    expect(off).not.toContain("bg-hot");
  });
});

describe("the off entry", () => {
  it("is offered above the behaviours", () => {
    expect(STUDY_MODE_OFF_OPTION.label).toBe("Off");
    expect(STUDY_MODE_OFF_OPTION.description).toBe("Show meanings and readings");
  });

  it("does not pretend to be a fifth behaviour", () => {
    expect(STUDY_MODE_BEHAVIOR_OPTIONS.map((mode) => mode.value)).not.toContain("off");
  });
});
