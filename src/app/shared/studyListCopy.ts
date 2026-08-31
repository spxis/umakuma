/**
 * Copy for saved character lists.
 *
 * Kept in one map rather than inline, so the locale layer swaps this file
 * rather than editing components.
 */
export const STUDY_LIST_COPY = {
  save: "Save as list",
  confirmSave: "Save",
  saving: "Saving",
  saved: "Saved",
  saveFailed: "Could not save that list.",
  nameLabel: "List name",
  namePlaceholder: "Week 1",

  heading: "Saved lists",
  subtitle: "The character sets you have built by hand",
  empty: "No saved lists yet. Choose some characters on any explorer and save them here.",
  emptyHint: "A list is a set you picked yourself — this week's kanji, the ones that keep going wrong.",
  practise: "Practise these",
  remove: "Delete",
  removeConfirmTitle: "Delete this list?",
  removeConfirmBody: "The characters stay where they are. Only the saved list goes.",
  removeFailed: "Could not delete that list.",
  countSuffix: "characters",
  countSuffixOne: "character",
  updatedPrefix: "Updated",
} as const;
