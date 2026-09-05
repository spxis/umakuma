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
  stage: "Stage",
  /* "5-6" for a two-rung tier, "7" for a one-rung tier: a range of one is a
     number, and printing "7-7" reads as a mistake. */
  stageRange: (levels: { level: number }[]) => {
    const first = levels[0]?.level ?? 0;
    const last = levels.at(-1)?.level ?? first;
    return first === last ? `${first}` : `${first}\u2013${last}`;
  },
  /* The age question comes first, because it decides which themes exist. */
  ageFirstHeading: "First, who is using this account?",
  ageFirstBlurb:
    "A few of the themes are about organised crime, nightlife and horror. Tell us this and we will only offer the ones that suit — you can change it whenever you like.",
} as const;

/** Copy for the XP rank panel, in the feature's own module for the locale layer. */
export const XP_RANK_COPY = {
  heading: "Your rank",
  blurb:
    "The other ladder. Your kanji level is what you have learned; your rank is what you have turned up for \u2014 reviews answered, lessons started, games finished. Neither one can be bought with the other.",
  standing: "Standing now",
  rankOf: (level: number, total: number) => `Rank ${level} of ${total}`,
  progressLabel: "How far through this rank",
  into: (into: number, span: number) => `${into.toLocaleString()} of ${span.toLocaleString()} XP into this rank`,
  next: "Next",
  toNext: (amount: number) => `${amount.toLocaleString()} XP to go`,
  atTop: "The top of the ladder. There is nothing above this one.",
  total: (xp: number) => `${xp.toLocaleString()} XP earned in all`,
  equivalents: "Known elsewhere as",
} as const;

/**
 * Copy for the five-question theme finder.
 *
 * Every label is keyed by the tag it sets, so the questionnaire draws itself
 * from `THEME_QUIZ_OPTIONS` and a tag added to the vocabulary without a word
 * for it fails the type check rather than rendering its own id at a member.
 */
export const THEME_QUIZ_COPY = {
  heading: "Find one in five questions",
  blurb:
    "Ninety sets of names is a lot to scroll. Answer as many of these as you feel like — or none of them — and we will put a few likely ones in front of you. The whole list stays below either way.",
  skip: "Skip this and keep browsing",
  clear: "Start these questions again",
  suggestions: "You might like these",
  suggestionsBlurb: "Pick one to switch to it. Nothing in your progress moves.",
  noMatches: "Nothing lines up with all of that. Try dropping an answer, or browse the full list below.",
  unanswered: "Answer one of these and suggestions will show up here.",
  /* Why a card came up, so a suggestion is never a black box. */
  because: (labels: string[]) => `Because you said ${labels.join(", ")}`,
  forced: "Off the table on this account",
  forcedBlurb:
    "Themes about organised crime, nightlife and the sex trade are only offered on accounts set to 18 or over.",
  questions: {
    draw: "What brings you to Japanese?",
    setting: "Where would you rather spend an afternoon?",
    style: "How do you like to win?",
    script: "How much Japanese in the words?",
    avoid: "Anything off the table?",
  } as const,
  /* One label per tag, in the questionnaire's own words. */
  tags: {
    anime: "Anime and manga",
    games: "Games",
    travel: "Travel",
    work: "Work",
    language: "The language itself",
    family: "Family",
    dojo: "A dojo",
    "city-night": "A city at night",
    spaceship: "A spaceship",
    "mountain-temple": "A mountain temple",
    office: "An office",
    stadium: "A stadium",
    discipline: "Discipline",
    cleverness: "Cleverness",
    power: "Raw power",
    kindness: "Kindness",
    "turning-up": "Turning up",
    "all-japanese": "All Japanese",
    "mixed-script": "A mix",
    "english-friendly": "English-friendly",
    violence: "Violence",
    underworld: "The underworld",
    "adult-content": "Adult themes",
  } as const,
} as const;

/**
 * The one chip shape the theme surfaces use.
 *
 * The age bands, the five questions and anything else that offers a small
 * pressable choice on this page draw from here, so a second chip cannot drift
 * a border or a weight away from the first.
 */
export const THEME_CHIP = {
  base: "inline-flex h-8 items-center rounded-full border px-3 text-[11px] font-bold transition",
  active: "border-accent bg-accent text-white",
  idle: "border-line bg-surface text-foreground/70 hover:bg-surface-muted",
} as const;
