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
  /* Said on a list that already holds everything chosen, rather than hiding it. */
  alreadyThere: "Everything chosen is already in this list.",
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
  newList: "New list",
  cancel: "Cancel",
  /* Shown on a list started here and not filled yet. */
  noCharactersYet: "Nothing in it yet — add characters from any explorer.",
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
  editCharacters: "Edit items",
  editHint: "Tap an item to take it out. Type kanji or words to add; a run of kanji is read one by one.",
  add: "Add",
  addPlaceholder: "Add kanji or words",
  addLabel: "Kanji or words to add",
  removeCharacterLabel: "Remove",
  /* The kind chips, on a card and in the viewer. */
  allKinds: "All",
  searchLists: "Search your lists",
  sortLabel: "Sort",
  sortUpdated: "Last changed",
  sortName: "Name",
  sortSize: "Size",
  reverse: "Reverse",
  noListsMatch: "No list matches that search.",

  /* The list's own page, and sharing it. */
  by: "by",
  created: "Made",
  changed: "Changed",
  copied: "copied",
  shared: "shared",
  timesSuffix: "times",
  onceSuffix: "once",
  visibilityLabel: "Who can see it",
  copyLink: "Copy link",
  linkCopied: "Link copied",
  shareHint: "Anyone with this link can open the list.",
  backToLists: "All lists",
  keepHeading: "Keep this list",
  keepBody: "Sign in to copy it into your own lists, tag what you know, and practise from it.",
  keepAction: "Sign in with Google",
  searchItems: "Search this list",
  openItem: "Open",
  emptyPublic: "Nothing in this list yet.",
  privateNotice: "Only you can see this list. Choose Link only or Public to share it.",
  editEmpty: "Saving now leaves the list empty. Delete it if you want it gone.",
  editFailed: "Could not change that list.",

  remove: "Delete",
  removeConfirmTitle: "Delete this list?",
  removeConfirmBody: "The characters stay where they are. Only the saved list goes.",
  removeFailed: "Could not delete that list.",
  countSuffix: "items",
  countSuffixOne: "item",
  updatedPrefix: "Updated",
} as const;

/**
 * Filing a search result as it is found: the column of tags and saved lists
 * that opens beside the results.
 */
export const SUBJECT_FILER_COPY = {
  open: "Add to lists",
  close: "Done",
  toggleTrouble: "Toggle trouble",
  toggleFavourite: "Toggle favourite",
  addTo: (name: string) => `Add to ${name}`,
  removeFrom: (name: string) => `Remove from ${name}`,
  noLists: "No saved lists yet",
  failed: "Could not save that.",
} as const;
