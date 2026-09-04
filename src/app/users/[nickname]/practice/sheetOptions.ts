import { toPaginationPlacement } from "@/app/shared/paginationPlacement";
import { decodeSelection, SELECTION_PARAM } from "@/app/shared/subjectSelection";
import { PRACTICE_SOURCES } from "@/lib/practiceSourceKinds";
import { LIST_KEY_PARAM } from "@/lib/studyListRules";

import { DEFAULT_GRADE } from "../grades/GradeExplorer.constants";
import { GRADE_SHORT_LABELS, isGradeOption, parsePageParam } from "../grades/gradeExplorerView";

import type { PracticeTarget } from "./practiceAddress";
import { PRACTICE_SHEET_COPY, PRINT_ALL_LIMIT, SHEET_SIZES, toSheetSize } from "./practiceCopy";
import { PRACTICE_PAGINATION_DEFAULT, PRINT_NOW_PARAM } from "./sheetLink";
import type { SheetPreferences } from "./sheetPreferences";
import type { SheetMode } from "./TracingSheet";

/**
 * The whole of a sheet's state, read out of its address.
 *
 * The sheet keeps every setting in the URL rather than in component state, so
 * a sheet set up a particular way is still a link somebody can send or print.
 * That is worth having and it is also a dozen parameters, each with a default
 * that has a reason behind it - and reading them inline left the page mostly
 * made of query parsing with the actual page at the bottom of it.
 *
 * Pure, and given the query rather than reading it, so the defaults can be
 * tested without a request.
 */
export type SheetOptions = ReturnType<typeof readSheetOptions>;

type Query = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * What the address says, or failing that what the reader chose last time.
 *
 * Ranked rather than merged: a link renders the same for whoever opens it,
 * and the memory only answers where the link is silent. See
 * `sheetPreferences.ts` for why the memory exists at all.
 */
export function readSheetOptions(
  query: Query,
  target: PracticeTarget | null,
  remembered: SheetPreferences = {},
) {
  const setting = (value: string | string[] | undefined, key: keyof SheetPreferences) =>
    firstValue(value) ?? remembered[key];
  const modeParam = typeof query.mode === "string" ? query.mode : null;
  const mode: SheetMode = modeParam === "strokes" || modeParam === "reference" ? modeParam : "trace";
  /*
   * The chooser is a URL state, not component state, so the page stays a
   * server component and a chosen sheet is still a link somebody can send or
   * print. Selecting the active source toggles it.
   */
  const choosing = target === null || firstValue(query.pick) === "1";
  /*
   * The model column defaults on and the readings default off, which is the
   * sheet as it printed before these became choices. Neither is a judgement
   * about which is better - that is what the checkboxes are for.
   */
  const showModel = setting(query.model, "model") !== "0";
  /*
   * Readings default off on a sheet to write on and on for the reference
   * sheet, because the readings are most of what a reference sheet is for. A
   * member who turns them off is still obeyed: the parameter is written
   * either way once they touch the control.
   */
  const readingsParam = setting(query.readings, "readings");
  const showReadings = readingsParam === null || readingsParam === undefined ? mode === "reference" : readingsParam === "1";
  /*
   * Numbering is on unless it is turned off, unlike the two above. A sheet is
   * something somebody is set to work through - "do twelve to twenty" needs
   * the numbers to be there by default, and a small grey figure costs the
   * page nothing when nobody is counting.
   */
  const showNumbers = setting(query.numbers, "numbers") !== "0";
  /*
   * Both ends by default here, unlike the shared component's own default. A
   * sheet is a page of tracing squares: reaching page four meant scrolling past
   * three of them to find the only Next link on the page.
   */
  const placement = toPaginationPlacement(firstValue(query.pager), PRACTICE_PAGINATION_DEFAULT);
  const size = toSheetSize(setting(query.size, "size"));
  /*
   * Reading and printing want different page sizes, so they get different page
   * sizes. A reading page is three sheets of paper at whatever size the
   * squares are, so printing one comes out whole; the print layout drops the
   * reading page entirely and cuts the list into the largest runs that still
   * render, so the characters flow and every sheet but the last one fills.
   */
  const printAll = firstValue(query.print) === "all";
  const source = target?.source ?? PRACTICE_SOURCES.grade;
  const level = target?.level ?? DEFAULT_GRADE;

  return {
    mode,
    choosing,
    showModel,
    showReadings,
    showNumbers,
    placement,
    size,
    printAll,
    /*
     * Whether the page's rows are shared out between the characters on it
     * rather than one row each. Off for a list; on for the sheet a single
     * character links to, which is that character and the page to work at it.
     */
    fill: setting(query.fill, "fill") === "1",
    printNow: firstValue(query[PRINT_NOW_PARAM]) === "1",
    pageSize: printAll ? PRINT_ALL_LIMIT : SHEET_SIZES[size].perPage,
    /*
     * A hand-picked sheet carries its characters, and the parameter is the
     * shared selection one: choosing on any surface and printing here is one
     * control rather than a feature of one page.
     */
    picked: decodeSelection(firstValue(query[SELECTION_PARAM])),
    page: parsePageParam(firstValue(query.page)),
    /*
     * The key an unlisted list's link carries. The reader's own lists need
     * none; it is only ever asked for when the sheet names somebody else's.
     */
    listKey: firstValue(query[LIST_KEY_PARAM]) ?? null,
    source,
    level,
    /* Only the grade ladder has a grade; the others carry a level of their own. */
    grade: isGradeOption(level) ? level : DEFAULT_GRADE,
  };
}

/**
 * What this sheet is called.
 *
 * A sheet built from a saved list is titled with the list's name, which is the
 * only thing that says which sheet this is - "Writing practice · G1" on a
 * sheet built from Week 2 is a different sheet's title. The name is handed in
 * with the entries rather than looked up again, so a list the reader may not
 * open cannot be named by a title on an empty sheet.
 */
export function sheetLabelFor(
  options: Pick<SheetOptions, "source" | "level" | "grade">,
  listName: string | null,
  /**
   * What is actually on the sheet, for a hand-picked one.
   *
   * "Chosen characters" is true of any hand-picked sheet and says nothing
   * about this one, which is a poor title for the commonest case of all: the
   * worksheet a character's own page links to, which holds that character and
   * nothing else. With one, the sheet is named after it; with several, at
   * least the count says how many were chosen.
   */
  entries: ReadonlyArray<{ kanji: string; meaning: string | null }> = [],
): string {
  const { source, level, grade } = options;
  if (source === PRACTICE_SOURCES.list) return listName ?? PRACTICE_SHEET_COPY.fromList;
  if (source === PRACTICE_SOURCES.picked) {
    /*
     * The character alone. The heading already reads "Writing practice · X",
     * so a meaning after it makes two middle dots in one line - and the row
     * under it says the meaning and the stroke count anyway.
     */
    const only = entries.length === 1 ? entries[0] : null;
    if (only) return only.kanji;
    return entries.length > 1 ? PRACTICE_SHEET_COPY.fromPickedCount(entries.length) : PRACTICE_SHEET_COPY.fromPicked;
  }
  if (source === PRACTICE_SOURCES.trouble) return PRACTICE_SHEET_COPY.fromTrouble;
  if (source === PRACTICE_SOURCES.favorite) return PRACTICE_SHEET_COPY.fromFavourite;
  if (source === PRACTICE_SOURCES.wanikani) return `WaniKani L${level}`;
  if (source === PRACTICE_SOURCES.jlpt) return `JLPT N${level}`;
  return GRADE_SHORT_LABELS[grade];
}
