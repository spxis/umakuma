import { JSDOM } from "jsdom";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { GEO_DATASETS } from "@/lib/geoRegion";
import { regionsInOrder } from "@/lib/mapStudy";

import MapRegionDirectory from "./MapRegionDirectory";
import { MAP_DIRECTORY_COPY } from "./MapStudy.constants";

const regions = regionsInOrder("JP");

function draw(marks = {}, hovered: string | number | null = null, activeArea: string | null = null): Document {
  const markup = renderToStaticMarkup(
    <MapRegionDirectory
      regions={regions}
      marks={marks}
      hovered={hovered}
      onHover={() => undefined}
      onChoose={() => undefined}
      divisionPlural="prefectures"
      activeArea={activeArea}
      onAreaHover={() => undefined}
      onAreaChoose={() => undefined}
      onAreaOpen={() => undefined}
    />,
  );
  return new JSDOM(`<!doctype html><body>${markup}</body>`).window.document;
}

/*
 * The panel is half the page, and with nothing chosen it held one line saying
 * so beside a map of 47 prefectures. It holds the country now.
 */
describe("the directory in the empty panel", () => {
  it("lists every region, each one a control of its own", () => {
    const document = draw();
    expect(document.querySelectorAll("li > button")).toHaveLength(GEO_DATASETS.JP.totalRegions);
  });

  it("says how many there are, in the country's own word for them", () => {
    expect(draw().body.textContent).toContain(MAP_DIRECTORY_COPY.heading(47, "prefectures"));
  });

  it("gives each row both scripts and its own outline", () => {
    const first = draw().querySelector("li > button")!;
    expect(first.textContent).toContain("北海道");
    expect(first.textContent).toContain("Hokkaido");
    expect(first.querySelector("svg path")?.getAttribute("d")).toBeTruthy();
  });

  /* Each icon is that region's own shape, not the country with a speck lit. */
  it("draws a different outline for every region", () => {
    const paths = [...draw().querySelectorAll("li > button svg path")].map((node) => node.getAttribute("d"));
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("groups them into the areas a map is read in, without losing one", () => {
    const document = draw();
    const headings = [...document.querySelectorAll("h3")].map((node) => node.textContent);
    expect(headings).toContain("Kanto");
    expect(headings.length).toBeLessThan(regions.length);
  });

  /* The row the pointer is on is the region the map is lighting. */
  it("lights the row the map is lighting", () => {
    const lit = [...draw({}, 13).querySelectorAll("li > button")].filter((node) =>
      (node.getAttribute("class") ?? "").includes("border-accent"),
    );
    expect(lit).toHaveLength(1);
    expect(lit[0]?.textContent).toContain("Tokyo");
  });

  /* Marked known on the board is marked known here, from the same tone. */
  it("paints a marked region the way the board paints it", () => {
    const document = draw({ "13": { status: "known", visited: false } });
    const painted = [...document.querySelectorAll("li > button svg path")].filter((node) =>
      (node.getAttribute("class") ?? "").includes("emerald"),
    );
    expect(painted).toHaveLength(1);
  });
});

/*
 * The glyph outline is drawn with `non-scaling-stroke`, so its width is screen
 * pixels. It used to be computed from the region's own box, which is map
 * units: Hokkaido's box is ten times Kagawa's, so Hokkaido got ten times the
 * border - 10.5 pixels of outline on a 36 pixel icon - and the biggest
 * prefectures were the ones that looked worst.
 */
describe("the glyph outline", () => {
  it("is the same width whatever size the real place is", () => {
    const widths = new Set(
      [...draw().querySelectorAll("svg path")].map((path) => path.getAttribute("stroke-width")),
    );
    expect(widths.size).toBe(1);
  });

  /* In screen pixels, so it has to stay small enough to be an outline. */
  it("stays a hairline rather than swallowing the shape", () => {
    const width = Number(draw().querySelector("svg path")?.getAttribute("stroke-width"));
    expect(width).toBeGreaterThan(0);
    expect(width).toBeLessThanOrEqual(2);
  });
});

/**
 * An area heading is a control, so a member can light the whole of Tohoku at
 * once rather than pointing at six prefectures in turn.
 */
describe("choosing a whole area", () => {
  it("offers every area as its own control", () => {
    const headings = [...draw().querySelectorAll("h3 > button")];
    expect(headings.length).toBeGreaterThan(1);
    expect(headings.map((button) => button.textContent)).toEqual(
      expect.arrayContaining([expect.stringContaining("Tohoku")]),
    );
  });

  it("marks the held area pressed and leaves the rest alone", () => {
    const held = [...draw({}, null, "Tohoku").querySelectorAll("h3 > button")].filter(
      (button) => button.getAttribute("aria-pressed") === "true",
    );
    expect(held).toHaveLength(1);
    expect(held[0]?.textContent).toContain("Tohoku");
  });

  /*
   * `nested-interactive`: the heading is a sibling of the rows, never their
   * wrapper. A button holding eight buttons is announced as one thing a screen
   * reader cannot get inside.
   */
  it("puts no control inside another", () => {
    for (const button of draw().querySelectorAll("button")) {
      expect(button.querySelector("button"), button.textContent ?? "").toBeNull();
    }
  });
});

/**
 * Double-tap is unreliable on a phone and fights the browser's own zoom, so a
 * held region grows an explicit way to open it - and only the held one, or
 * eight "Open" buttons would be shouting over the list.
 */
describe("opening a region", () => {
  it("offers to open only the region that is held", () => {
    expect(draw().querySelectorAll('button[aria-label^="Open "]')).toHaveLength(0);
    const open = [...draw({}, null, "Tohoku").querySelectorAll('button[aria-label^="Open "]')];
    expect(open.map((button) => button.getAttribute("aria-label"))).toEqual([MAP_DIRECTORY_COPY.regionOpen("Tohoku")]);
  });

  /* Beside the heading, not inside its button: a control never holds a control. */
  it("keeps the open control out of the heading's own button", () => {
    const document = draw({}, null, "Tohoku");
    for (const button of document.querySelectorAll("h3 button")) {
      expect(button.querySelector("button")).toBeNull();
    }
    expect(document.querySelector('h3 button[aria-label^="Open "]')).toBeNull();
  });
});
