/**
 * Everything the theme surfaces say, in one module for the locale layer.
 *
 * This lived in `profileCopy.ts` while the profile was the only place a
 * member could read or change a theme. It is three surfaces now — the strip in
 * the header, the theme's own page, and the profile card — so the words moved
 * to the shared module rather than one page importing another page's copy.
 */

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
  close: "Done",
  /* The button that opens the browser, on every surface that offers one. */
  browse: "Browse themes",
  browseTitle: "Browse every theme and switch",
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



/**
 * The theme's own page: what this set of names is, stage by stage.
 *
 * A separate surface from the profile card on purpose. The profile answers
 * "what is on, and change it"; this answers "what will a review actually call
 * me", which needs all ten rungs and the WaniKani word beside each one — the
 * only vocabulary a member arriving from there already has.
 */
export const THEME_PAGE_COPY = {
  title: "Your theme",
  subtitle: (name: string) => `What ${name} calls each stage`,
  heading: "Every stage, top to bottom",
  blurb:
    "Ten rungs: the one you have not started, and the nine an item climbs. Nothing here changes what you review or when — only what the stage is called when it comes up.",
  profile: "Profile",
  /* From the profile card into the page that reads the whole theme out. */
  readMore: "See every stage",
  stage: "Stage",
  /* Stage 0 is not a rung a member reached; it is the one they have not left. */
  notStarted: "Not started",
  tier: "Tier",
  term: "Name",
  meaning: "In English",
  wanikani: "WaniKani calls it",
  tiers: "The five tiers",
  tiersBlurb:
    "The rungs are not evenly spread. Four of them sit in the first tier, because that is where an item comes back in hours rather than months.",
} as const;
