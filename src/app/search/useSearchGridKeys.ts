"use client";

import { useCallback, type KeyboardEvent } from "react";

import { LOAD_LEAD_ROWS } from "./Search.constants";
import { SEARCH_COL_ATTR, SEARCH_ROW_ATTR, focusSearchCell, focusSearchInput } from "./searchFocus";
import { isCell, isGridKey, nearColumnEnd, nextCell } from "@/lib/searchGrid";

/**
 * The arrows, over results laid out in columns.
 *
 * Up and down walk a column; left and right cross between them, keeping the
 * row where the next column is long enough and clamping where it is not. The
 * awkward maths lives in `searchGrid`, away from the DOM, because a move that
 * lands on a row which does not exist reads as the keyboard being broken and
 * is very hard to see wrong on screen.
 *
 * Escape and Home are the way out, and they are not a nicety: arrowing down
 * loads the next stretch as it nears the end, so a long column grows under you
 * and walking back up is a trip that gets longer the further you go.
 */
export function useSearchGridKeys({
  lengths,
  onNearEnd,
}: {
  /** How many rows each drawn column holds, in the order they appear. */
  lengths: number[];
  /** Asked for more of that column, where there is more to ask for. */
  onNearEnd?: (column: number) => void;
}) {
  return useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (!isGridKey(event.key)) return;

      const row = (event.target as HTMLElement).closest<HTMLElement>(`[${SEARCH_COL_ATTR}]`);
      if (!row) return;

      const current = {
        column: Number(row.getAttribute(SEARCH_COL_ATTR) ?? -1),
        row: Number(row.getAttribute(SEARCH_ROW_ATTR) ?? -1),
      };
      if (current.column < 0 || current.row < 0) return;

      /*
       * Claimed before the move is worked out, not after. Left and right would
       * otherwise scroll the page sideways while also moving the focus, and
       * down would scroll past the row it had just focused.
       */
      event.preventDefault();

      if (event.key === "ArrowDown" && nearColumnEnd(lengths, current, LOAD_LEAD_ROWS)) {
        onNearEnd?.(current.column);
      }

      const move = nextCell(lengths, current, event.key);
      if (move === "input") {
        focusSearchInput();
        return;
      }
      if (isCell(move)) focusSearchCell(move.column, move.row);
    },
    [lengths, onNearEnd],
  );
}
