import { STUDY_TAGS, type StudyTag } from "@/lib/domainConstants";

export const STUDY_TAG_LIST_LABELS: Record<StudyTag, string> = {
  [STUDY_TAGS.trouble]: "Trouble",
  [STUDY_TAGS.favorite]: "Favourites",
  [STUDY_TAGS.burned]: "Burned",
};

export const STUDY_TAG_LIST_COPY = {
  title: "Your lists",
  button: "Trouble & favourites",
  close: "Close lists",
  loading: "Loading your lists...",
  loadError: "Could not load your lists.",
  noMatches: "Nothing in this list matches that search.",
  remove: "Remove from this list",
  addNote: "Add a note",
  editNote: "Edit this note",
  noteTitle: "Why it is on this list",
  noteHint: "A mnemonic, the sentence you met it in, the mistake it keeps causing.",
  notePlaceholder: "Why this one?",
  noteSave: "Save note",
  noteClear: "Clear",
  noteSaving: "Saving...",
  noteFailed: "Could not save that note.",
  searchPlaceholder: "Search characters or meanings",
  empty: {
    [STUDY_TAGS.trouble]: "Nothing tagged as trouble yet. Flag an item from Study or an explorer to build this list.",
    [STUDY_TAGS.favorite]: "No favourites yet. Tag an item from Study or an explorer to build this list.",
    [STUDY_TAGS.burned]: "Nothing burned yet. Mark what you know so well you never need to read it, and it stays out of every list you open.",
  },
  /* Applying the Burned list to what is being read. */
  hideBurned: (count: number) => `Hide ${count} burned`,
  burnedHidden: (count: number) => `${count} burned hidden`,
  applyWanikani: (count: number) => `Apply ${count} burned from WaniKani`,
  applyWanikaniNone: "Nothing burned on WaniKani yet",
  applyWanikaniDone: (count: number) => (count === 0 ? "Already applied." : `Applied ${count}.`),
  applying: "Applying",
  /* The viewer's title: what kind of list this is, and how big. */
  savedListKicker: "Saved list",
  builtInKicker: "Built-in lists",
  clearSearch: "Clear search",
  removeFromList: "Take out of this list",
  edit: "Edit",
  editingDone: "Done",
  /* A saved list, opened from its card. */
  countSuffix: "items",
  countSuffixOne: "item",
  emptyList: "This list has no characters in it yet. Use Edit characters on the card to add some.",
} as const;
