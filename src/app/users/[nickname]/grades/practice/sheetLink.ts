import type { PaginationPlacement } from "@/app/shared/paginationPlacement";

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

export type SheetSettings = {
  source: string;
  grade: number;
  level: number;
  page: number;
  mode: SheetMode;
  showModel: boolean;
  showReadings: boolean;
  placement: PaginationPlacement;
  size: SheetSize;
  /** Whether the level chooser is open. */
  choosing: boolean;
  /** The hand-picked characters, encoded, when the sheet is a picked one. */
  picked: string;
};

/**
 * Defaults stay out of the query string, so an untouched sheet's link is short
 * enough to read and the same sheet always has the same address.
 */
export function sheetHref(settings: SheetSettings, changes: Partial<SheetSettings> = {}): string {
  const next = { ...settings, ...changes };

  const parts = [
    `source=${next.source}`,
    `grade=${next.grade}`,
    `level=${next.level}`,
    `page=${next.page}`,
    `mode=${next.mode}`,
  ];

  if (!next.showModel) parts.push("model=0");
  if (next.showReadings) parts.push("readings=1");
  if (next.placement !== PRACTICE_PAGINATION_DEFAULT) parts.push(`pager=${next.placement}`);
  if (next.size !== DEFAULT_SHEET_SIZE) parts.push(`size=${next.size}`);
  if (next.choosing) parts.push("pick=1");
  // Kept last: it is the longest parameter and the least worth reading.
  if (next.picked) parts.push(`picked=${encodeURIComponent(next.picked)}`);

  return `?${parts.join("&")}`;
}
