import { STUDY_TAGS, type StudyTag } from "@/lib/domainConstants";

export const STUDY_TAG_LIST_LABELS: Record<StudyTag, string> = {
  [STUDY_TAGS.trouble]: "Trouble",
  [STUDY_TAGS.favorite]: "Favourites",
};

export const STUDY_TAG_LIST_COPY = {
  title: "Your lists",
  button: "Trouble & favourites",
  close: "Close lists",
  loading: "Loading your lists...",
  loadError: "Could not load your lists.",
  noMatches: "Nothing in this list matches that search.",
  remove: "Remove from this list",
  searchPlaceholder: "Search characters or meanings",
  empty: {
    [STUDY_TAGS.trouble]: "Nothing tagged as trouble yet. Flag an item from Study or an explorer to build this list.",
    [STUDY_TAGS.favorite]: "No favourites yet. Tag an item from Study or an explorer to build this list.",
  },
  /* A saved list, opened from its card. */
  countSuffix: "items",
  countSuffixOne: "item",
  emptyList: "This list has no characters in it yet. Use Edit characters on the card to add some.",
} as const;
