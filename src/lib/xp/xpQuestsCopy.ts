import type { XpQuestKind } from "./xpQuests";

/**
 * Every word a member reads about their daily quests, in one map.
 *
 * It lives beside the quests rather than in the profile page's `profileCopy.ts`
 * because the feature spans both: the quest titles are what the panel prints
 * *and* what a settled award writes onto the day's `XpEvent` row, and a title
 * kept in two places drifts into two different names for the same quest. One
 * module, so the locale layer swaps the feature rather than half of it.
 *
 * Canadian spelling, per the audience rule.
 */

/** What a member is asked to do, on the card. */
export const XP_QUEST_TITLES: Record<XpQuestKind, string> = {
  wellRoundedDay: "Learn something, then play",
  queueCleared: "Empty your review queue",
  fiftyReviewDay: "Answer fifty reviews",
  flawlessDay: "Twenty reviews, none wrong",
};

/** The sentence under the title, saying what finishing it takes. */
export const XP_QUEST_BLURBS: Record<XpQuestKind, string> = {
  wellRoundedDay: "One new lesson and one finished game, in the same day.",
  queueCleared: "Everything that came due today, answered. However many that is.",
  fiftyReviewDay: "Fifty answers, right or wrong — this one is about turning up.",
  flawlessDay: "At least twenty reviews with nothing wrong in any of them.",
};

/**
 * What lands on the `XpEvent` row when a quest pays.
 *
 * The type row already says what the kind is for; this says which quest was
 * finished, so a member reading a history line gets the day's own answer.
 */
export const XP_QUEST_NOTES: Record<XpQuestKind, string> = {
  wellRoundedDay: "Quest finished: a lesson and a game.",
  queueCleared: "Quest finished: review queue emptied.",
  fiftyReviewDay: "Quest finished: fifty reviews.",
  flawlessDay: "Quest finished: a flawless day.",
};

/** The panel's own chrome. */
export const XP_QUEST_COPY = {
  heading: "Today's quests",
  blurb:
    "Two or three things to finish today, picked to suit the size of your ordinary day. They are here so a session has an end in it — nothing is lost by ignoring them, and they come back tomorrow.",
  reward: (xp: number) => `+${xp} XP`,
  progress: (at: number, target: number) => `${at.toLocaleString()} of ${target.toLocaleString()}`,
  progressLabel: (title: string) => `Progress on: ${title}`,
  done: "Done",
  spoiled: "Not today",
  spoiledHint: "A wrong answer today. This one comes back tomorrow.",
  /* Distinguished from empty, per the loading/empty rule: a member with no
     board has not finished anything, they have not started. */
  empty: "Nothing to show yet. Answer a review and today's quests appear.",
  allDone: "Every quest finished. That is the day.",
  earnedToday: (xp: number) => `${xp.toLocaleString()} XP from quests today`,
} as const;
