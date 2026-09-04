/** Copy for the profile page, in one map for the locale layer. */
export const PROFILE_COPY = {
  heading: "Profile",
  displayName: "Display name",
  displayNameHint: "What other members see. Change it whenever you like — your links keep working.",
  displayNamePlaceholder: "Pick a name",
  address: "Your address",
  addressHint: "Permanent, so anything you have shared keeps pointing here.",
  wanikani: "WaniKani",
  wanikaniLevel: "Level",
  wanikaniNone: "Not connected",
  wanikaniPending: "Connected",
  wanikaniPendingHint: "Your level arrives with the first sync.",
  wanikaniHint: "Set by WaniKani, not editable here.",
  jlpt: "JLPT",
  jlptHint: "As you report it. The year decides which version of the test applies.",
  jlptAddFirst: "Add a certificate",
  jlptAddAnother: "Add another",
  jlptAdd: "Add",
  jlptDone: "Done",
  jlptRemoveLabel: (label: string, year: number) => `Remove ${label} from ${year}`,
  jlptStatus: "Status",
  jlptYear: "Year",
  jlptLevel: "Level",
  jlptNone: "Not set",
  save: "Save",
  saving: "Saving…",
  saved: "Saved",
  saveFailed: "Could not save that.",
  visibility: "Who can see you",
  visibilityHint: "Your name and scores on leaderboards. Nothing here is shared outside UmaKuma unless you pick Public.",
  games: "Games",
  gamesKind: "Game",
  gamesEmpty: "No finished games yet.",
  gamesRuns: "Runs",
  gamesBest: "Best score",
  gamesStreak: "Best streak",
  gamesAccuracy: "Accuracy",
  gamesLast: "Last played",
  gamesTotals: "Across every game",
  notPlayed: "—",
} as const;

/** How the stored status values read to a member. */
export const JLPT_STATUS_LABELS: Record<string, string> = {
  passed: "Passed a level",
  planned: "Plan to sit one",
  none: "No certificate",
  undisclosed: "Rather not say",
};

/** Copy for the theme picker, in the feature's own module for the locale layer. */
export const THEME_PICKER_COPY = {
  heading: "What your stages are called",
  blurb:
    "WaniKani calls them Apprentice, Guru, Master, Enlightened and Burned, and that is the only set its learners get. Pick any of these instead. Nothing in your progress moves when you switch — only the words do, so you can change whenever you like.",
  current: "On now",
  ageHeading: "Who is using this account",
  ageBlurb:
    "Not a birthdate. A few themes are about organised crime and nightlife, and this is how we know whether to offer them.",
  ageBands: {
    under_13: "Under 13",
    "13_17": "13 to 17",
    "18_plus": "18 or over",
  } as Record<string, string>,
  search: "Search the themes…",
  count: (shown: number, total: number) =>
    shown === total ? `${total} to choose from` : `${shown} of ${total}`,
  saveFailed: "Could not save that. Try again?",
} as const;
