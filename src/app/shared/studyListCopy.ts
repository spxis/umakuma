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
   * The writing sheet, called what it is.
   *
   * "Practise these" was the only thing a list offered and it opened a sheet
   * of tracing squares, which is a worksheet - so a member looking for one
   * could not tell that they already had it, and a member wanting to drill
   * the list on screen found a printout instead.
   */
  worksheet: "Worksheet",
  worksheetHint: "A writing sheet you can trace and print",
  print: "Print",

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

  /* Keeping somebody else's list. */
  copyToMine: "Copy to my lists",
  copying: "Copying",
  copyHint: "A copy is yours to change. Following keeps the owner's list, as they change it.",
  copyFailed: "Could not copy that list.",
  follow: "Follow",
  following: "Following",
  followFailed: "Could not change that.",
  followedHeading: "Following",
  followedBlurb: "Lists other members keep, and you read. They change as the owner changes them.",
  followedGone: "Now private",
  unfollow: "Unfollow",
  addToLists: "Add to my lists",
  copiedFrom: "Copied from",

  /* Lists nobody owns, that keep themselves. */
  liveListsHeading: "Auto lists",
  liveListsBlurb: "Kept by UmaKuma rather than by a person, and always what the data says today. Follow one to keep it, or copy it and make it yours to cut down. A star marks the ones you follow.",
  liveListPill: "Auto list",
  liveListBlurb: "Kept by UmaKuma; it changes as the data does.",
  liveCopyHint: "A copy is yours to cut down. Following keeps it current.",
  allLiveLists: "All auto lists",
  liveJlptBlurb: "Every kanji the JLPT lists at each level, commonest first.",
  liveGradeBlurb: "What Japanese children are taught, year by year.",
  liveWkBlurb: "Every radical, kanji and word WaniKani teaches at each level.",
  liveSeeAll: "See all",

  /* A list out of pasted text. */
  importFromText: "From text",
  importHint: "Paste anything Japanese. Nothing is kept but the items you save.",
  importPlaceholder: "Paste a passage, a handout, a page of a book...",
  importRead: "Find items",
  importReading: "Reading",
  importSave: "Save as list",
  importFailed: "Could not read that text.",
  importFound: (kanji: number, words: number) => `Found ${kanji} kanji and ${words} words. Tap one to take it out.`,
  importTruncated: "Only the first part of that text was read.",
  importKeepHint: "Drop a whole kind:",
  importDropKind: (plural: string) => `Drop ${plural.toLowerCase()}`,

  /* Two lists made into one. */
  merge: "Merge",
  mergeHint: "Pick two or more, in the order they should combine.",
  mergePickTwo: "Pick two lists or more.",
  mergeResult: (total: number, shared: number) =>
    shared === 0
      ? `The merged list holds ${total} items.`
      : `The merged list holds ${total} items; ${shared} were in more than one list.`,
  mergeRemoveSources: "Clear the sources away",
  mergeFailed: "Could not merge those lists.",
  reloadForApplied: "Reload to see them here.",
  signOut: "Sign out",
  signingOut: "Signing out...",

  /* Other members changing a list. */
  contributionsLabel: "Who can add",
  contributeOpenHeading: "Add to this list",
  contributeOpenHint: "This list is open: what you add goes straight in.",
  contributeLockedHeading: "Suggest an addition",
  contributeLockedHint: "This list is locked: the owner decides on what you suggest.",
  propose: "Suggest",
  proposalNotePlaceholder: "Why? (optional)",
  contributeFailed: "Could not send that.",
  contributedApplied: (count: number) => `Added ${count} ${count === 1 ? "item" : "items"}.`,
  contributedProposed: (count: number) => (count === 0 ? "Nothing new to suggest." : `Suggested ${count} ${count === 1 ? "item" : "items"} to the owner.`),
  proposeRemoval: "Suggest taking this out",
  proposeRemovalShort: "Take out?",
  proposed: "Suggested",
  proposalsHeading: "Suggested changes",
  proposalAdd: "Add",
  proposalRemove: "Take out",
  approve: "Approve",
  decline: "Decline",
  decideFailed: "Could not settle that.",

  /* Finishing with a list others hold. */
  archivedHeading: "Archived",
  archivedBlurb: "Finished lists other people still hold. Readable by them, closed to change, yours to bring back.",
  archivedPrefix: "Archived",
  archivedPill: "Archived",
  archivedNotice: "This list is archived: it can be read, copied and followed, but not changed.",
  archive: "Archive",
  restore: "Restore",
  deleteForGood: "Delete for good",
  deleteForGoodTitle: "Delete this list for good?",
  deleteForGoodBody: "Everyone who follows it or holds its link loses it. Copies they made stay theirs.",
  archiveConfirmTitle: "Archive this list?",
  archiveConfirmBody: "Other people hold it, so it is kept for them: readable, closed to change, and yours to restore. Delete it for good from the Archived section.",
  editEmpty: "Saving now leaves the list empty. Delete it if you want it gone.",
  editFailed: "Could not change that list.",

  remove: "Delete",
  removeConfirmTitle: "Delete this list?",
  removeConfirmBody: "The characters stay where they are. Only the saved list goes.",
  removeFailed: "Could not delete that list.",
  countSuffix: "items",
  countSuffixOne: "item",
  updatedPrefix: "Updated",
  sourceHeading: "New in the original",
  sourceAdded: (count: number, name: string) =>
    `${count} ${count === 1 ? "item has" : "items have"} been added to ${name || "the list you copied"} since.`,
  sourceTakeAll: "Take all",
  sourceTakeOne: "Take",
  metaFollowers: (count: number) => `${count} following`,
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
