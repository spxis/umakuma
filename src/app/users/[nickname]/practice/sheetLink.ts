import type { PaginationPlacement } from "@/app/shared/paginationPlacement";
import { practiceSourceHasLevels, practiceSourceHasSlug, type PracticeSource } from "@/lib/practiceSourceKinds";
import { LIST_KEY_PARAM } from "@/lib/studyListRules";

import { practiceHref } from "./practiceAddress";

import { DEFAULT_SHEET_SIZE, type SheetSize } from "./practiceCopy";
import type { SheetMode } from "./TracingSheet";

/**
 * Every state a sheet can be in, and the one place its link is built.
 *
 * The sheet keeps all of it in the URL rather than in component state, so a
 * sheet set up a particular way is still something you can send to somebody or
 * bookmark for next week. That is worth having, but it meant every control
 * concatenated its own query string - and each one had to remember to carry
 * every other control's setting. Adding the pager broke the size links, adding
 * the size broke the pager's, and both failures look like a control quietly
 * resetting an unrelated option.
 *
 * So the settings are one object and the link is one function: name what you
 * are changing, and everything else comes along by construction.
 */

/**
 * This sheet's pager default, which is not the shared component's.
 *
 * `SurfacePagination` defaults to the foot because that is where a pager
 * conventionally sits; a tracing sheet wants both ends, because its foot is
 * three thousand pixels down. The omit-the-default rule below has to test
 * against the surface's answer - against the component's, choosing "Bottom"
 * would drop the parameter and read back as "Both".
 */
export const PRACTICE_PAGINATION_DEFAULT: PaginationPlacement = "both";

/**
 * The one-shot flag that opens the print dialog on arrival.
 *
 * Deliberately absent from `SheetSettings`, so `sheetHref` can never carry it.
 * Choosing "Everything" is a request to print now; changing the square size
 * afterwards is not, and a flag that rode along in every link would reopen the
 * dialog on each option the reader touched.
 */
export const PRINT_NOW_PARAM = "go";

export type SheetSettings = {
  /** Whose page the sheet is on, since the address is built from it. */
  nickname: string;
  source: string;
  grade: number;
  level: number;
  page: number;
  mode: SheetMode;
  showModel: boolean;
  showReadings: boolean;
  showNumbers: boolean;
  placement: PaginationPlacement;
  size: SheetSize;
  /** Whether the level chooser is open. */
  choosing: boolean;
  /**
   * Whether the sheet is paged for reading or for printing. It persists like
   * any other setting: a reader who chose the print view and then changed the
   * square size meant a differently-sized print view, not a trip back.
   */
  printAll: boolean;
  /** The hand-picked characters, encoded, when the sheet is a picked one. */
  picked: string;
  /** The saved list's slug, when the sheet is built from one. */
  slug: string | null;
  /** Whose list it is, when the sheet is built from somebody else's. */
  owner: string | null;
  /**
   * The key an unlisted list's link carries.
   *
   * It rides in every option link for the same reason the slug does: without
   * it, changing the square size on a sheet built from an unlisted list drops
   * the key, the next page cannot open the list, and the sheet empties itself
   * as though the reader had been signed out.
   */
  listKey: string | null;
};

/**
 * Defaults stay out of the query string, so an untouched sheet's link is short
 * enough to read and the same sheet always has the same address.
 */
export function sheetHref(settings: SheetSettings, changes: Partial<SheetSettings> = {}): string {
  const next = { ...settings, ...changes };

  /*
   * The collection is the address, not a parameter. Every control here used to
   * write `?source=…&level=…`, which the page stopped reading when practice
   * moved to `/practice/jlpt/5` - so each chip changed the query and the page
   * re-read the unchanged path and rendered exactly what it already showed.
   */
  const source = next.source as PracticeSource;
  const carriesLevel = practiceSourceHasLevels(source);
  const path = practiceHref(next.nickname, {
    source,
    level: carriesLevel ? next.level : null,
    /* A saved list is named in the path, so every option link has to carry it. */
    slug: practiceSourceHasSlug(source) ? next.slug : null,
    owner: practiceSourceHasSlug(source) ? next.owner : null,
  });

  const parts: string[] = [];
  if (next.page > 1) parts.push(`page=${next.page}`);
  if (next.mode !== "trace") parts.push(`mode=${next.mode}`);

  if (!next.showModel) parts.push("model=0");
  /*
   * Readings are off by default on a sheet to write on and on by default on
   * the reference sheet, so "off" has to be written down there - otherwise
   * turning them off drops the parameter, the default puts them back, and the
   * checkbox reads as broken.
   */
  if (next.showReadings) parts.push("readings=1");
  else if (next.mode === "reference") parts.push("readings=0");
  if (!next.showNumbers) parts.push("numbers=0");
  if (next.placement !== PRACTICE_PAGINATION_DEFAULT) parts.push(`pager=${next.placement}`);
  if (next.size !== DEFAULT_SHEET_SIZE) parts.push(`size=${next.size}`);
  if (next.choosing) parts.push("pick=1");
  if (practiceSourceHasSlug(source) && next.listKey) {
    parts.push(`${LIST_KEY_PARAM}=${encodeURIComponent(next.listKey)}`);
  }
  if (next.printAll) parts.push("print=all");
  // Kept last: it is the longest parameter and the least worth reading.
  if (next.picked) parts.push(`picked=${encodeURIComponent(next.picked)}`);

  return parts.length > 0 ? `${path}?${parts.join("&")}` : path;
}
