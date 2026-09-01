/**
 * Copy for saved character lists.
 *
 * Kept in one map rather than inline, so the locale layer swaps this file
 * rather than editing components.
 */
export const STUDY_LIST_COPY = {
  /* Said where a saved list would say when it changed. */
  builtIn: "Built in — tag anything to add to it",
  open: "Open",

  /* The two sections, which differ in what a member may do to them. */
  permanentHeading: "Always here",
  permanentBlurb: "These two fill themselves as you tag while you study. They cannot be deleted.",
  savedHeading: "Saved by you",
  savedBlurb: "Sets you put together yourself. Rename or delete one whenever you like.",
  save: "Save as list",
  confirmSave: "Save",
  saving: "Saving",
  saved: "Saved",
  saveFailed: "Could not save that list.",
  nameLabel: "List name",
  namePlaceholder: "Week 1",

  heading: "Your lists",
  /*
   * Not "built by hand" any more: Trouble and Favourites are here too, and
   * those two fill themselves as you tag things while you study.
   */
  subtitle: "Trouble and Favourites, and any set you have saved",
  empty: "No saved lists yet. Choose some characters on any explorer and save them here.",
  emptyHint: "A list is a set you picked yourself — this week's kanji, the ones that keep going wrong.",
  practise: "Practise these",

  /*
   * Renaming happens in the card, not a dialog: the name is short, and what
   * tells one list from another is the characters underneath it, which a modal
   * would cover.
   */
  rename: "Rename",
  renameCancel: "Cancel",
  renameFailed: "Could not rename that list.",

  /*
   * Editing what is in a list, which until now could only be done by saving
   * over it from a surface that happened to have the right selection - so
   * dropping one character meant picking the other forty again.
   */
  editCharacters: "Edit characters",
  editHint: "Tap a character to take it out, or type more to add.",
  add: "Add",
  addPlaceholder: "Add characters",
  addLabel: "Characters to add",
  removeCharacterLabel: "Remove",
  editEmpty: "A list needs at least one character. Delete it instead.",
  editFailed: "Could not change that list.",

  remove: "Delete",
  removeConfirmTitle: "Delete this list?",
  removeConfirmBody: "The characters stay where they are. Only the saved list goes.",
  removeFailed: "Could not delete that list.",
  countSuffix: "characters",
  countSuffixOne: "character",
  updatedPrefix: "Updated",
} as const;
