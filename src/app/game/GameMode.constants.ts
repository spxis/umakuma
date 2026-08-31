import {
  GAME_KINDS,
  GAME_PRACTICE_LISTS,
  gameKindRules,
  type GameCategory,
  type GamePracticeList,
  type GameDateRange,
  type GameKind,
  type GameLeaderboardMode,
  type GameMetric,
} from "@/lib/gameMode";

export const GAME_COPY = {
  title: "Game Mode",
  subtitle: "Fast rounds. Family bragging rights.",
  hubTitle: "Games",
  hubSubtitle: "Six ways to play, from your review pile to the map of Japan.",
  activityNeverPlayed: "Not played yet",
  activityPlayingNow: "playing now",
  activityAndOthers: "and {count} more",
  activityLastPrefix: "Last",
  activityYouPrefix: "You",
  activityYouNever: "You have not played this yet",
  loading: "Loading Game Mode...",
  loadError: "Could not load Game Mode.",
  start: "Start game",
  starting: "Starting...",
  allLevels: "All levels",
  level: "Level",
  category: "Category",
  questions: "Questions",
  timeLimit: "Time limit",
  scoreboard: "Family scoreboard",
  recentGames: "Recent games",
  noScores: "No completed games yet.",
  noRecentGames: "No recent games yet.",
  scoreRule: "Accuracy earns up to 1,000 points. Level and every 0.1 second add bounded bonuses, but accuracy always wins.",
  notEnoughItems: "This combination does not have enough started items.",
  notEnough: "Not enough items",
  needsWanikani: "Needs WaniKani",
  needsWanikaniHint: "This game draws on your WaniKani reviews. Connect it from your profile, or try Map and the Daily Challenge, which need nothing.",
  chooseMatch: "Choose the matching item",
  chooseAnswer: "Choose the answer",
  mapCountry: "Country",
  direction: "Direction",
  answerWith: "Answer with",
  chooseChain: "Choose the word that starts with this kana",
  /* "prefecture" is Japan's word for it; the board says which to use. */
  chooseRegion: (division: string) => `Choose the ${division.toLowerCase()}`,
  nameHighlightedRegion: (division: string) => `Name the highlighted ${division.toLowerCase()}`,
  mapCloseUp: "Close up",
  prefectures: "Prefectures",
  score: "Score",
  time: "Time",
  streak: "Best streak",
  correct: "Correct",
  complete: "Round complete",
  hardMode: "Hard mode",
  choices: "Choices",
  corners: "Corners",
  cornersHint: "Two corners always play. Add the bottom two before you start.",
  addCorner: "Add this corner",
  removeCorner: "Remove this corner",
  practiceList: "Practice from",
  practiceEmpty: "Nothing tagged for this list yet. Tag items from Study or the explorers first.",
  viewLists: "Trouble & favourites",
  ultraMode: "Ultra mode",
  regularMode: "Regular",
  playAgain: "Play again",
  questionsCorrect: "correct",
  backToGames: "All games",
  changeGame: "Change game",
  play: "Play",
  timeUp: "Time!",
  chainLength: "Chain",
  dailyPlayed: "Played today",
  dailyComeBack: "Back tomorrow",
  dailyReady: "Ready to play",
  dailyOneAttempt: "One attempt per day. Everyone gets the same questions.",
  resumedDaily: "Picking up today's unfinished attempt.",
  ultraRule: "Keep going until the first wrong answer, or three full rounds of the pool. Time and streak keep running.",
} as const;

export const GAME_STORAGE_KEYS = {
  selection: "umakuma:game:selection",
  leaderboardFilters: "umakuma:game:leaderboard-filters:v2",
} as const;

export const GAME_CATEGORY_LABELS: Record<GameCategory, string> = {
  radical: "Radicals",
  kanji: "Kanji",
  vocabulary: "Vocabulary",
  mixed: "Mixed",
};

export const GAME_KIND_LABELS: Record<GameKind, string> = {
  [GAME_KINDS.match]: "Match",
  [GAME_KINDS.daily]: "Daily Challenge",
  [GAME_KINDS.revenge]: "Practice",
  [GAME_KINDS.timeAttack]: "Time Attack",
  [GAME_KINDS.shiritori]: "Shiritori",
  [GAME_KINDS.map]: "Map",
};

export const GAME_KIND_TAGLINES: Record<GameKind, string> = {
  [GAME_KINDS.match]: "Fast rounds. Family bragging rights.",
  [GAME_KINDS.daily]: "Same questions for everyone. One shot.",
  [GAME_KINDS.revenge]: "Drill the lists you built yourself.",
  [GAME_KINDS.timeAttack]: "Beat the clock, not the question count.",
  [GAME_KINDS.shiritori]: "Chain words by their last kana.",
  [GAME_KINDS.map]: "Forty-seven prefectures. Know them all?",
};

export const GAME_KIND_RULE_COPY: Record<GameKind, string> = {
  [GAME_KINDS.match]: "Pick the item that matches the meaning or reading. Choose your level, category and round length.",
  [GAME_KINDS.daily]: "Ten questions pitched at the level the regular players share. One attempt per day, same set for everyone.",
  [GAME_KINDS.revenge]: "Drills one list at a time: the items you tagged as trouble, the ones you tagged as favourites, or the ones your review history says are toughest.",
  [GAME_KINDS.timeAttack]: "Answer as many as you can before the clock runs out. Wrong answers cost you, but they do not end the run.",
  [GAME_KINDS.shiritori]: "Each word has to start with the kana the last one ended on. One wrong link ends the chain.",
  [GAME_KINDS.map]: "Name the prefecture lit up on the map, or take a name and pick it out yourself. The wrong answers are its neighbours, so a rough idea will not save you.",
};

export const GAME_KIND_EMOJI: Record<GameKind, string> = {
  [GAME_KINDS.match]: "⚡",
  [GAME_KINDS.daily]: "📅",
  [GAME_KINDS.revenge]: "🎯",
  [GAME_KINDS.timeAttack]: "⏱️",
  [GAME_KINDS.shiritori]: "🔗",
  [GAME_KINDS.map]: "🗾",
};

/** Per-game accents so each game reads as its own thing on the hub and scoreboard. */
export const GAME_KIND_ACCENT: Record<GameKind, { border: string; text: string; solid: string }> = {
  [GAME_KINDS.match]: { border: "border-accent/50", text: "text-accent", solid: "border-accent bg-accent text-white" },
  [GAME_KINDS.daily]: { border: "border-amber-500/50", text: "text-amber-600", solid: "border-amber-500 bg-amber-500 text-white" },
  [GAME_KINDS.revenge]: { border: "border-red-500/50", text: "text-red-600", solid: "border-red-600 bg-red-600 text-white" },
  [GAME_KINDS.timeAttack]: { border: "border-sky-500/50", text: "text-sky-600", solid: "border-sky-600 bg-sky-600 text-white" },
  [GAME_KINDS.shiritori]: { border: "border-emerald-500/50", text: "text-emerald-600", solid: "border-emerald-600 bg-emerald-600 text-white" },
  [GAME_KINDS.map]: { border: "border-indigo-500/50", text: "text-indigo-600", solid: "border-indigo-600 bg-indigo-600 text-white" },
};

export const GAME_LEADERBOARD_MODE_LABELS: Record<GameLeaderboardMode, string> = {
  all: "Overall",
  ...GAME_CATEGORY_LABELS,
};

export const GAME_RANGE_LABELS: Record<GameDateRange, string> = {
  today: "Today",
  yesterday: "Yesterday",
  "seven-days": "Last 7 days",
};

export const GAME_METRIC_LABELS: Record<GameMetric, string> = {
  score: "Score",
  time: "Time",
  streak: "Best streak",
};

/** Read is recognition and Find is recall, which is the harder of the two. */
export const GAME_DIRECTION_LABELS: Record<string, string> = {
  read: "Read",
  find: "Find",
};

export const GAME_DIRECTION_HINTS: Record<string, string> = {
  read: "See the character, choose what it means or how it reads.",
  find: "See the meaning or reading, choose the character.",
};

/** Map mode swaps the glyph for a prefecture, so its directions need their own words. */
export const GAME_MAP_DIRECTION_HINTS: Record<string, string> = {
  read: "See the prefecture on the map, choose its name.",
  find: "See the name, pick the prefecture out on the map.",
};

export const GAME_PRACTICE_LIST_LABELS: Record<GamePracticeList, string> = {
  [GAME_PRACTICE_LISTS.trouble]: "Trouble",
  [GAME_PRACTICE_LISTS.favorite]: "Favourites",
  [GAME_PRACTICE_LISTS.toughest]: "Toughest",
};

export const GAME_PRACTICE_LIST_HINTS: Record<GamePracticeList, string> = {
  [GAME_PRACTICE_LISTS.trouble]: "The items you flagged as trouble.",
  [GAME_PRACTICE_LISTS.favorite]: "The items you tagged as favourites.",
  [GAME_PRACTICE_LISTS.toughest]: "No tagging needed: whatever your review history says you are weakest on.",
};

export const GAME_ANSWER_MODE_LABELS: Record<string, string> = {
  auto: "Mixed",
  meaning: "Meaning",
  reading: "Reading",
  romaji: "Romaji",
};

/**
 * How long a corner or the word stays lit for a key that cannot answer.
 * Long enough to register, short enough not to sit in the way of the next press.
 */
export const GAME_BOARD_FLASH_MS = 280;

export const GAME_CORNER_PLACEHOLDER_CLASS = "flex min-w-0 items-center justify-center rounded-2xl border border-dashed border-line bg-surface-muted/50";

/**
 * Every tile round is played on the same four corners; only how many are live
 * changes. Map mode has no corners, so there the number is just a choice count.
 */
export function gameCornersLabel(kind: GameKind, choiceCount: number): string {
  const noun = gameKindRules(kind).usesCornersBoard ? GAME_COPY.corners : GAME_COPY.choices;
  return `${noun} ${choiceCount}`;
}

/**
 * How a prefecture is painted in Map mode.
 *
 * `target` is the one the question is about, `candidate` is a tile the player can
 * pick, and the rest of the country sits back as `idle` so the choices carry the
 * eye. `line` matches the shape's stroke for the handle's leader line, and
 * `handle` is solid so its number stays readable over any terrain.
 */
export const MAP_TONES = {
  idle: "idle",
  candidate: "candidate",
  target: "target",
  correct: "correct",
  wrong: "wrong",
} as const;

export const MAP_TONE_CLASS: Record<string, { shape: string; line: string; handle: string }> = {
  [MAP_TONES.idle]: { shape: "fill-foreground/10 stroke-line", line: "stroke-line", handle: "fill-foreground/60 stroke-white" },
  [MAP_TONES.candidate]: { shape: "fill-indigo-500/30 stroke-indigo-600", line: "stroke-indigo-600", handle: "fill-indigo-600 stroke-white" },
  [MAP_TONES.target]: { shape: "fill-indigo-600 stroke-indigo-800", line: "stroke-indigo-800", handle: "fill-indigo-700 stroke-white" },
  [MAP_TONES.correct]: { shape: "fill-emerald-500 stroke-emerald-700", line: "stroke-emerald-700", handle: "fill-emerald-600 stroke-white" },
  [MAP_TONES.wrong]: { shape: "fill-red-500 stroke-red-700", line: "stroke-red-700", handle: "fill-red-600 stroke-white" },
};

export const GAME_MIXED_PILL_CLASS = "subject-pill border-line bg-surface-muted text-foreground";
export const GAME_LEVEL_PILL_CLASS = "subject-pill border-accent/30 bg-accent/10 text-accent";

export function gameDifficultyLabel(kind: GameKind, choiceCount: number, ultraMode: boolean, direction?: string): string {
  const choices = gameCornersLabel(kind, choiceCount);
  const pair = direction ? `${GAME_DIRECTION_LABELS[direction] ?? ""} · ${choices}`.trim() : choices;
  return ultraMode ? `Ultra · ${pair}` : pair;
}

export function gameTimeLimitLabel(timeLimitMs: number): string {
  const seconds = Math.round(timeLimitMs / 1000);
  return seconds >= 60 && seconds % 60 === 0 ? `${seconds / 60} min` : `${seconds}s`;
}
