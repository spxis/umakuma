/**
 * Sixteen more kinds of XP, proposed rather than decided.
 *
 * John asked for a set to react to — "I can fix up later if I don't like" — so
 * these are a starting position, not a finished economy. They are deliberately
 * kept out of `XP_AWARDS` and `XP_BONUSES`: those two maps are the awards the
 * site actually gives, and mixing a pile of unfired kinds into them would make it
 * impossible to see at a glance what the economy really is.
 *
 * There were twenty. Four of them - `queueCleared`, `flawlessDay`,
 * `fiftyReviewDay` and `wellRoundedDay` - turned out to be quest-shaped and
 * moved into `XP_BONUSES` when the daily quests were wired, repriced on the
 * way. That is the intended exit from this file: a kind leaves when
 * something fires it.
 *
 * They still seed into `XpType`, so every one appears in the admin screen with
 * its amount and its note, and the amount can be changed there without a
 * deploy — which is why the table exists. Nothing fires until it is wired.
 *
 * They are grouped by what they are actually rewarding, because that is the
 * question worth asking of each one: are we paying for effort, for reaching
 * something, for coming back, or for setting the site up. A site that pays
 * mostly for setup teaches people to fiddle with settings.
 *
 * Every value is a multiple of five, per the same rule the ranks follow.
 */

export const XP_PROPOSED_AWARDS = {
  // --- Arriving. Once each, and small: these are for getting started, and a
  // member should not be able to feel they have "earned" much by signing up.
  /** The very first lesson, ever. */
  firstLesson: 25,
  /** The very first review answered. */
  firstReview: 25,
  /** A profile filled in: nickname, age band, a theme chosen. */
  profileCompleted: 50,
  /** A WaniKani account connected. */
  wanikaniConnected: 100,
  /** WaniKani progress carried across, which is a real decision. */
  wanikaniImported: 150,

  // --- Reaching. The curriculum ladder's own milestones, paid on the XP one.
  /** Every tenth UmaKuma level. */
  curriculumLevelTen: 250,
  /** Level 50, the halfway mark of the whole ladder. */
  curriculumHalfway: 1000,
  /** Level 100. The end of the curriculum. */
  curriculumComplete: 5000,
  /** A hundred items burned. */
  hundredBurned: 300,

  /* --- Effort, on a day. Four of these have left: `queueCleared`,
     `flawlessDay`, `fiftyReviewDay` and `wellRoundedDay` became the daily
     quests and live in `XP_BONUSES` now, repriced for a kind that fires most
     days rather than now and again. What is left here is still waiting. */
  /** Every radical on a level learned, before its kanji. */
  levelRadicalsCleared: 50,

  // --- Games. Kept modest, since games already pay per finish and the daily
  // allowance is what a rank buys.
  /** A personal best on any game. */
  personalBest: 50,
  /** A perfect round. */
  flawlessGame: 50,
  /** Every prefecture found on the map. */
  mapCleared: 200,

  // --- Coming back, and staying. The ones that matter most on a family site.
  /** Returning after a fortnight or more away. Paid once per absence. */
  comeback: 100,
  /** A year since joining. */
  anniversary: 500,
  /** A weekend with both days studied. */
  fullWeekend: 25,
} as const;

export type XpProposedAwardKind = keyof typeof XP_PROPOSED_AWARDS;

/** What each is for, in the words a member reads on their own history. */
export const XP_PROPOSED_NOTES: Record<XpProposedAwardKind, string> = {
  firstLesson: "For your very first lesson.",
  firstReview: "For your very first review.",
  profileCompleted: "For filling in your profile and choosing how your stages are named.",
  wanikaniConnected: "For connecting your WaniKani account.",
  wanikaniImported: "For bringing your WaniKani progress across.",
  curriculumLevelTen: "For every tenth level on the kanji ladder.",
  curriculumHalfway: "For reaching level 50 — halfway up the whole ladder.",
  curriculumComplete: "For finishing the curriculum. All hundred levels.",
  hundredBurned: "For carrying a hundred items all the way to the top stage.",
  levelRadicalsCleared: "For learning every radical on a level before meeting its kanji.",
  personalBest: "For beating your own best score.",
  flawlessGame: "For a game with every answer right.",
  mapCleared: "For finding every prefecture on the map.",
  comeback: "For coming back after a fortnight or more away.",
  anniversary: "For a year since you joined.",
  fullWeekend: "For studying on both days of a weekend.",
};
