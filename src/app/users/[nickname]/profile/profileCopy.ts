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
  /* What the next rank asks for in total, so the two boxes both end with a
     number rather than one carrying a figure and the other a blank. */
  nextAt: (level: number, at: number) => `Rank ${level} starts at ${at.toLocaleString()} XP`,
  total: (xp: number) => `${xp.toLocaleString()} XP earned in all`,
  equivalents: "Known elsewhere as",
} as const;

/**
 * The XP line in the profile's own header.
 *
 * Says the same three facts the rank card below says at length - the total,
 * the rung, what is left - in one line, because the header is read at a glance
 * and the card is read on purpose. Asked for in this shape by John on
 * 2026-09-05: "50000 XP (L10 Black Belt)".
 */
export const PROFILE_XP_HEADLINE_COPY = {
  label: "XP",
  total: (xp: number) => `${xp.toLocaleString()} XP`,
  /** `L10 Elder`. The rung is bare because the total beside it says XP. */
  rank: (badge: string, name: string) => `${badge} ${name}`,
  toNext: (amount: number, name: string) => `${amount.toLocaleString()} XP to ${name}`,
  atTop: "The top of the ladder",
  title: (level: number, name: string, total: number) =>
    `Rank ${level}, ${name} — ${total.toLocaleString()} XP earned in all`,
} as const;

export const STUDY_PREFS_COPY = {
  heading: "How you want to study",
  blurb:
    "These are yours to set, and you can change them whenever you like. They change how studying feels and how fast you take on new work — never how much you have to know to reach a level.",
  reviewOrder: {
    label: "Which reviews come first",
    note: "The same reviews either way. Only the order changes.",
    options: {
      overdue: "Most overdue first",
      lowestStage: "Newest material first",
      shuffled: "Shuffled",
      easiest: "Easiest first",
      hardest: "Hardest first",
    } as Record<string, string>,
  },
  testInterval: {
    label: "How often you are offered a checkpoint",
    note: "A short test on what you have just learned. It opens the level whatever you score, so it is practice rather than a gate.",
    options: (interval: number) => (interval === 0 ? "Never" : interval === 1 ? "Every level" : `Every ${interval} levels`),
  },
  throttle: {
    label: "New lessons while reviews are waiting",
    note: "Holding lessons back while you are behind keeps the pile from growing. It makes levels come slower and reviews feel lighter.",
    options: {
      site: "Use the site's setting",
      on: "Hold them back",
      off: "Keep giving me lessons",
    } as Record<string, string>,
  },
  batchSize: {
    label: "Items in one sitting",
    note: "A shorter sitting is a shorter sitting, not an easier one.",
  },
  /* The line, said out loud. A member offered choices deserves to know where
     they stop, rather than finding out by being surprised. */
  fixed:
    "Some things are the same for everybody and are not yours to change: how many of a level's kanji you need at Guru to move up, how long the review intervals are, and the JLPT tests at levels 10, 20, 35, 50 and 100. UmaKuma level 40 has to mean the same thing on your profile as on anybody else's.",
  presets: {
    label: "Start from a set of settings",
    note: "A shortcut to settings you could pick by hand. None of them changes what a level is worth — a gentle member and an intense one need exactly the same kanji at Guru to reach level 40.",
    options: {
      gentle: "Gentle",
      steady: "Steady",
      intense: "Intense",
    } as Record<string, string>,
    descriptions: {
      gentle: "Short sittings, easiest first, lessons held back while reviews wait, practice every third level.",
      steady: "The middle of the road, and what most people should start with.",
      intense: "Long sittings, hardest first, nothing held back, practice every tenth level.",
    } as Record<string, string>,
    suggested: (name: string) => `Suggested for this account: ${name}`,
    custom: "Your own settings",
  },
  saveFailed: "Could not save that. Try again?",
} as const;
