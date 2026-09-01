/**
 * What the bulk-selection panel says.
 *
 * Kept out of the component so the eventual locale layer swaps one map rather
 * than reading a dozen strings out of the JSX around them.
 */
export const BULK_SELECTION_COPY = {
  title: "Bulk Selection Active",
  selectedOne: "Selected 1 item",
  /** `Selected 12 items` — the count is inserted before this. */
  selectedManySuffix: "items",
  selectedPrefix: "Selected",
  showList: "View Full List",
  hideList: "Hide Full List",
  hint: "Shift+click to select ranges.",
  selectVisible: "Select Visible",
  clear: "Clear",
  done: "Done",
  removeOne: "Remove from selection",
} as const;
