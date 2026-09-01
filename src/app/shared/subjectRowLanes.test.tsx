import { readFileSync } from "node:fs";
import { join } from "node:path";

import { JSDOM } from "jsdom";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import SubjectRows from "./SubjectRows";
import { SUBJECT_ROW_LANES, SUBJECT_VIEW_COPY, toSubjectListRow } from "./subjectListView";
import { SRS_BUCKETS, SUBJECT_TYPES } from "@/lib/domainConstants";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const BULK_PANEL = "src/app/users/[nickname]/shared/ExplorerBulkSelectionPanel.tsx";
const STUDY_PANEL = "src/app/users/[nickname]/study-explorer/components/StudyExplorerPanel.tsx";
const LEVEL_GRID = "src/app/users/[nickname]/level-explorer/components/LevelExplorerItemsGrid.tsx";

/**
 * One list layout, not two.
 *
 * The bulk-selection panel drew a six-column table - item, reading, meaning,
 * type, level, SRS - and it was the best-reading list on the site, because a
 * column of subjects is scanned down one field at a time. Every other list
 * stacked the reading under the meaning in a free-flowing row, so the good
 * layout was the one nothing else could use and the panel was the one surface
 * that could not be improved without improving it alone.
 *
 * The table is gone. Its shape is `SubjectRows`, which history, the study
 * queue, the tagged lists and the panel all render through.
 */

function render(node: Parameters<typeof renderToStaticMarkup>[0]): Document {
  return new JSDOM(`<!doctype html><body>${renderToStaticMarkup(node)}</body>`).window.document;
}

const ROWS = [
  toSubjectListRow({
    subjectId: 1,
    characters: "水",
    subjectType: SUBJECT_TYPES.kanji,
    meanings: ["Water"],
    primaryReadings: ["すい"],
    wkLevel: 3,
    srsStage: 5,
    status: SRS_BUCKETS.guru,
  }),
  toSubjectListRow({
    subjectId: 2,
    characters: "大人",
    subjectType: SUBJECT_TYPES.vocabulary,
    meanings: ["Adult"],
    readings: ["おとな"],
    wkLevel: 11,
    srsStage: 1,
    status: SRS_BUCKETS.apprentice,
  }),
];

describe("the shared subject list", () => {
  it("names every column the table named", () => {
    const doc = render(<SubjectRows rows={ROWS} onSelect={() => {}} />);
    const headings = [...doc.querySelectorAll("span")].map((el) => el.textContent);
    for (const column of [
      SUBJECT_VIEW_COPY.columnItem,
      SUBJECT_VIEW_COPY.columnReading,
      SUBJECT_VIEW_COPY.columnMeaning,
      SUBJECT_VIEW_COPY.columnType,
      SUBJECT_VIEW_COPY.columnLevel,
      SUBJECT_VIEW_COPY.columnSrs,
    ]) {
      expect(headings).toContain(column);
    }
  });

  /*
   * The point of the whole exercise. A heading that is a different width from
   * the column under it is worse than no heading, so both take their widths
   * from the same map rather than each carrying its own classes.
   */
  it.each(Object.entries(SUBJECT_ROW_LANES))(
    "gives the %s lane one width, shared by the heading and the rows",
    (lane, classes) => {
      const source = read("src/app/shared/SubjectRows.tsx");
      const columns = read("src/app/shared/subjectColumns.tsx");
      const uses = `${source}${columns}`.split(`SUBJECT_ROW_LANES.${lane}`).length - 1;
      expect(uses, `${lane} should be referenced, not written out as ${classes}`).toBeGreaterThan(0);

      /*
       * And never written out beside the reference. Skipped for the meaning
       * lane alone, whose "min-w-0 flex-1" is also what the row button itself
       * needs to fill the line - a width the heading cannot drift away from,
       * since neither side names a number.
       */
      if (lane !== "meaning") expect(source).not.toContain(classes);
    },
  );

  /*
   * The heading and the cell take their width from the same column object, so
   * an unusual field list cannot put a heading over the wrong lane.
   */
  it("draws headings and cells from one column set", () => {
    const source = read("src/app/shared/SubjectRows.tsx");
    expect(source).toContain("columns.map((column)");
    expect(source).toContain("className={`${column.lane}");
  });

  /* The reading has a column of its own now; it must not also sit under the meaning. */
  it("shows the reading once at a width that has a column for it", () => {
    const doc = render(<SubjectRows rows={ROWS} onSelect={() => {}} />);
    const readings = [...doc.querySelectorAll('[lang="ja"]')].filter((el) => el.textContent === "すい");
    expect(readings).toHaveLength(2);
    /* One stacked under the meaning, phone-only... */
    expect(readings.filter((el) => el.className.includes("md:hidden"))).toHaveLength(1);
    /* ...and one in the reading lane, which is the half that appears at `md`. */
    expect(
      readings.filter((el) => el.parentElement?.className.includes(SUBJECT_ROW_LANES.reading)),
    ).toHaveLength(1);
  });

  /*
   * Six columns do not fit on a 393px phone, so the narrow lanes collapse and
   * the heading goes with them - "Item / Meaning" over two obvious columns is
   * a row of chrome bought at the price of a row of content.
   */
  it("hides the headings where the columns collapse", () => {
    const doc = render(<SubjectRows rows={ROWS} onSelect={() => {}} />);
    const heading = doc.querySelector(".sticky.top-0");
    expect(heading?.className).toContain("hidden");
    expect(heading?.className).toContain("md:flex");
  });

  /* A row is one button. Trailing controls are its siblings, never its children. */
  it("keeps the trailing slot outside the row button", () => {
    const doc = render(
      <SubjectRows rows={ROWS} onSelect={() => {}} renderTrailing={() => <button type="button">×</button>} />,
    );
    const nested = [...doc.querySelectorAll("button")].filter((el) => el.parentElement?.closest("button"));
    expect(nested).toEqual([]);
  });

  it("lets a surface say what pressing a row does", () => {
    const doc = render(<SubjectRows rows={ROWS} onSelect={() => {}} rowLabel={(row) => `Drop ${row.glyph}`} />);
    expect(doc.querySelector("button")?.getAttribute("aria-label")).toBe("Drop 水");
  });
});

describe("what the bulk panel stopped owning", () => {
  const panel = read(BULK_PANEL);

  it("renders the shared list instead of its own table", () => {
    expect(panel).toContain("SubjectRows");
    expect(panel).not.toContain("<table");
    expect(panel).not.toContain("<thead");
  });

  /*
   * A table cell could not be pressed, so removing one item you picked by
   * mistake meant clearing all of them and starting again. The shared row is
   * already a button; this is what it means here.
   */
  it("removes one item from a row rather than only clearing all of them", () => {
    expect(panel).toContain("onRemoveSelected(row.subjectId)");
    for (const path of [STUDY_PANEL, LEVEL_GRID]) {
      expect(read(path), `${path} should wire the per-row removal`).toContain("onRemoveSelected=");
    }
  });

  /*
   * `rows` holds what is already chosen, so gating "Select Visible" on it
   * disabled the one control for choosing in bulk until you had chosen
   * something by hand.
   */
  it("offers Select Visible before anything is selected", () => {
    const button = panel.slice(panel.indexOf("onClick={onSelectVisible}"));
    expect(button.slice(0, button.indexOf("</button>"))).not.toContain("rows.length === 0");
  });

  /* Four hand-written copies of the same seven fields is four readings to get wrong. */
  it.each([
    ["the study explorer", STUDY_PANEL],
    ["the level explorer", LEVEL_GRID],
  ])("builds %s rows with the shared adapter", (_label, path) => {
    expect(read(path)).toContain("toSubjectListRow");
  });
});

/**
 * Choosing in a list, not only in a grid.
 *
 * Bulk mode put a checkbox on every card in the grid and nothing at all on a
 * row, and a row's click still opened the review modal - so a set could be
 * gathered in one density and not the other, and the panel's Save to list sat
 * above a list it could not be fed from.
 */
/**
 * A list is one surface, not a stack of boxes.
 *
 * Every explorer drew its rows as separate bordered cards with gaps between
 * them - each row an edge for the eye to stop at - while Study and History drew
 * one surface with hairlines. Same idea, four sets of classes.
 */
describe("the chrome a list wears", () => {
  it("defines the surface and its hairlines in one place", () => {
    const source = read("src/app/shared/SubjectRows.tsx");
    expect(source).toContain("SUBJECT_LIST_SURFACE");
    expect(source).toContain("SUBJECT_LIST_DIVIDERS");
  });

  /*
   * The explorers no longer name the surface at all - they render through the
   * shared list, which draws it. That is the stronger version of the same
   * guarantee: a surface that cannot name its own chrome cannot drift from it.
   */
  it.each([
    ["the grade explorer", "src/app/users/[nickname]/grades/GradeKanjiGrid.tsx"],
    ["the JLPT explorer", "src/app/users/[nickname]/jlpt-explorer/components/JlptExplorerContent.tsx"],
  ])("draws %s list through the shared component", (_label, path) => {
    const source = read(path);
    expect(source).toMatch(/(GradeKanjiRows|JlptExplorerRows)/);
    /* And never the stack of boxes it replaced. */
    expect(source).not.toContain("space-y-1.5");
  });

  /* The WaniKani explorer still draws its own rows; it shares only the chrome. */
  it("draws the WaniKani explorer from the shared surface", () => {
    const source = read(LEVEL_GRID);
    expect(source).toContain("SUBJECT_LIST_SURFACE");
    expect(source).toContain("SUBJECT_LIST_DIVIDERS");
    expect(source).not.toContain("space-y-1.5");
  });

  /*
   * Each surface says which fields it shows. That difference was always real -
   * grades have on and kun and no SRS - and letting it decide the layout is
   * what produced five lists that looked like five products.
   */
  it.each([
    ["the grade explorer", "src/app/users/[nickname]/grades/GradeKanjiRows.tsx"],
    ["the JLPT explorer", "src/app/users/[nickname]/jlpt-explorer/components/JlptExplorerRows.tsx"],
  ])("lets %s declare its own columns", (_label, path) => {
    const source = read(path);
    expect(source).toContain("SubjectColumn");
    expect(source).toContain("columns={");
    /* From the shared lane widths, so the headings still line up. */
    expect(source).toContain("SUBJECT_ROW_LANES");
  });

  /* A row's own box is dropped in rows even when the caller still passes one. */
  it("gives a row no box of its own", () => {
    const card = read("src/app/users/[nickname]/shared/UnifiedExplorerCard.tsx");
    expect(card).toContain("rows ? SUBJECT_LIST_ROW : className");
  });
});

describe("picking a row", () => {
  const picked = new Set([2]);
  const withPicking = (active: boolean) =>
    render(
      <SubjectRows
        rows={ROWS}
        onSelect={() => {}}
        picking={{ active, isChosen: (row) => picked.has(row.subjectId), onPick: () => {} }}
      />,
    );

  it("shows a checkbox on every row while choosing", () => {
    const boxes = [...withPicking(true).querySelectorAll("span")].filter((el) =>
      el.className.includes("rounded border"),
    );
    expect(boxes).toHaveLength(ROWS.length);
  });

  it("shows none when the surface is not choosing", () => {
    const boxes = [...withPicking(false).querySelectorAll("span")].filter((el) =>
      el.className.includes("rounded border"),
    );
    expect(boxes).toHaveLength(0);
  });

  it("says which rows are picked, for a reader who cannot see the tick", () => {
    const pressed = [...withPicking(true).querySelectorAll("button[aria-pressed]")].map((el) =>
      el.getAttribute("aria-pressed"),
    );
    expect(pressed).toEqual(["false", "true"]);
  });

  /* A surface with its own bulk mechanism must reach this, or it has none. */
  it("is wired from the study list", () => {
    const source = read("src/app/users/[nickname]/study-explorer/components/StudyExplorerRows.tsx");
    expect(source).toContain("picking={{");
    expect(source).toContain("onApplyBulkSelection");
    expect(read(STUDY_PANEL)).toContain("onApplyBulkSelection={applyBulkSelection}");
  });
});

/**
 * A list you saved yourself, readable.
 *
 * The card offered rename, edit characters, delete and practise, so the one
 * thing a member could not do with a list they had built was read it.
 */
describe("opening a saved list", () => {
  const CARD = "src/app/users/[nickname]/lists/StudyListCard.tsx";
  const MODAL = "src/app/shared/StudyTagListsModal.tsx";

  it("offers a way in from the card, and from the characters themselves", () => {
    const card = read(CARD);
    expect(card).toContain("list: { id: card.id, name: card.name }");
    /* Both densities put the preview on the handler, not only the action. */
    expect(card.split("onClick={openList}").length - 1).toBeGreaterThanOrEqual(4);
  });

  it("reads the list through its own route rather than the tag route", () => {
    expect(read(MODAL)).toContain("/lists/${savedList.id}/items");
  });

  /*
   * The tagged lists filter by flag, which would empty a saved list, and offer
   * a switch to the other tagged list, which would offer to leave the list just
   * opened.
   */
  it("drops the tag filter and the tag switch for a saved list", () => {
    const modal = read(MODAL);
    expect(modal).toContain("savedList ? true : item.studyTags[tag]");
    expect(modal).toContain("savedList ? (");
  });

  it("scopes the route to the account, not just to the list id", () => {
    const route = read("src/app/api/study/[accountId]/lists/[listId]/items/route.ts");
    expect(route).toContain("where: { id: listId, accountId }");
    expect(route).toContain("canAccessAccount");
  });

  /* The member chose these in a sequence; re-sorting shows a different list. */
  it("keeps the order the list is stored in", () => {
    const lib = read("src/lib/studySubjectItems.ts");
    expect(lib).toContain("characters\n    .map((character) => subjectIdByCharacter.get(character))");
  });
});

describe("the shared adapter", () => {
  it("prefers the primary reading over the rest", () => {
    const row = toSubjectListRow({
      subjectId: 9,
      characters: "上",
      primaryReadings: ["じょう"],
      readings: ["うえ", "じょう"],
    });
    expect(row.reading).toBe("じょう");
  });

  it("falls back to the readings when there is no primary one", () => {
    expect(toSubjectListRow({ subjectId: 9, characters: "上", readings: ["うえ"] }).reading).toBe("うえ");
  });

  /* A source that carries its own bucket keeps it; one that does not gets it from the stage. */
  it("derives the SRS bucket only when the source has none", () => {
    expect(toSubjectListRow({ subjectId: 9, characters: "上", srsStage: 5 }).srsBucket).toBe(SRS_BUCKETS.guru);
    expect(
      toSubjectListRow({ subjectId: 9, characters: "上", srsStage: 5, status: SRS_BUCKETS.locked }).srsBucket,
    ).toBe(SRS_BUCKETS.locked);
  });
});
