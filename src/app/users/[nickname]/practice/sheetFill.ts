import { SHEET_SIZES, type SheetSize } from "./practiceCopy";

/**
 * How many rows each character gets when the page is to be filled.
 *
 * A list sheet gives every character one row and moves on; the practice a
 * single character wants is the opposite - that character, and the rest of
 * the page to work at it. The same sheet does both: with the page filled, its
 * rows are shared equally between the characters on it, so one kanji takes
 * the whole page and two take half each. A share includes whatever the
 * character's own rows are - its stroke chart, say - and the sheet tops the
 * rest up with rows to trace and write in.
 *
 * Never less than one, so a long list with the option on still prints.
 */
export function fillRowsPerEntry(size: SheetSize, entryCount: number): number {
  return Math.max(1, Math.floor(SHEET_SIZES[size].rowsPerPage / Math.max(1, entryCount)));
}
