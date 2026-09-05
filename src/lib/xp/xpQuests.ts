import { XP_AWARDS, XP_BONUSES } from "./xpAwards";
import { XP_QUEST_NOTES } from "./xpQuestsCopy";
import type { XpAwardRequest } from "./xpStudyAwards";

/**
 * Two or three small targets a day, and what they are for.
 *
 * The point of a quest is not the XP. It is that an open-ended session has no
 * end in it — "do some reviews" is a thing a person puts off, where "answer
 * fifty reviews" is a thing they finish. What actually gets somebody to sit
 * down is knowing when they will be allowed to stand up.
 *
 * **A quest is a question about today's `XpEvent` rows, so none of this needs
 * storing.** One row per account, per kind, per Vancouver day, with an amount:
 * `reviewAnswered` at 1 XP an answer *is* the count of answers, and the row
 * for a quest's own kind existing is the record that it has been paid. There
 * is no quest table, no assignment table and no nightly job, and the day's
 * selection is recomputed rather than remembered — which is why it is derived
 * from days *before* today, so it cannot move under a member while they are
 * working through it.
 *
 * `queueCleared` is the one exception and it is worth stating: the queue is
 * `UkSrsState`, not `XpEvent`, so finishing it needs a count. That count is
 * taken only when the quest is on the day's board and has not been paid yet,
 * which is the narrow window it is actually needed in.
 *
 * **A quest a member cannot finish is a quest that teaches them to ignore
 * quests.** So the targets are fixed and the *selection* moves: a quest is
 * offered only to somebody whose ordinary day already reaches what it asks
 * for. A member answering ten reviews a day is never shown "answer fifty" —
 * they get the two that any size of day can finish. A member answering sixty
 * gets the harder ones as well. That is why the pool is deliberately uneven in
 * difficulty rather than uniformly gentle.
 */

/** The four kinds that are quests. Each lives in `XP_BONUSES` with its price. */
export const XP_QUEST_KINDS = ["wellRoundedDay", "queueCleared", "fiftyReviewDay", "flawlessDay"] as const;

export type XpQuestKind = (typeof XP_QUEST_KINDS)[number];

export type XpQuest = {
  kind: XpQuestKind;
  /**
   * Reviews a day this quest effectively asks for.
   *
   * The selection filter, and the whole reason a light member is not shown a
   * heavy target. Zero means any size of day can finish it.
   */
  asksFor: number;
  /** True when settling it needs the review queue counted. */
  needsQueue: boolean;
};

/** How many reviews `flawlessDay` needs before a clean day counts as one. */
export const XP_FLAWLESS_DAY_MIN = 20;
/** How many reviews `fiftyReviewDay` asks for. It is in the name. */
export const XP_FIFTY_REVIEW_DAY_TARGET = 50;

/**
 * The pool, easiest first.
 *
 * Order matters: the day's board is drawn from this list by rotation, and
 * keeping it in order of demand means a member who is eligible for only the
 * first two gets exactly those two rather than a random pair.
 */
export const XP_QUESTS: readonly XpQuest[] = [
  { kind: "wellRoundedDay", asksFor: 0, needsQueue: false },
  /* Asks for nothing in particular because it asks for whatever is there. A
     member with eight items due clears eight; a member with two hundred due
     does not, and neither of them was handed somebody else's target. */
  { kind: "queueCleared", asksFor: 0, needsQueue: true },
  { kind: "flawlessDay", asksFor: XP_FLAWLESS_DAY_MIN, needsQueue: false },
  { kind: "fiftyReviewDay", asksFor: XP_FIFTY_REVIEW_DAY_TARGET, needsQueue: false },
];

/** Most quests a member is shown at once. Three is a board; six is a chore. */
export const XP_QUESTS_PER_DAY = 3;

/** How far back the member's ordinary day is measured. */
export const XP_QUEST_PROFILE_DAYS = 28;

/** One day of a member's XP history, as `XpEvent` holds it. */
export type XpQuestDay = { dayKey: string; kind: string; amount: number };

/** What today looks like so far, in the units a quest asks about. */
export type XpQuestCounters = {
  reviewsAnswered: number;
  reviewsCorrect: number;
  lessonsStarted: number;
  gamesFinished: number;
  /** Items still due. Null when nothing counted them, which is not zero. */
  reviewsDue: number | null;
};

export type XpQuestProgress = {
  kind: XpQuestKind;
  /** How far along, in the quest's own units. */
  at: number;
  target: number;
  done: boolean;
  /**
   * True when the day can no longer produce this one — a wrong answer on a
   * flawless day. Worth saying out loud rather than showing a bar stuck at
   * zero for a member who has done forty reviews.
   */
  spoiled: boolean;
  /** What finishing it pays. */
  xp: number;
};

/**
 * Today's counts, read out of today's rows.
 *
 * Divided by what each award is worth rather than counted, because the row
 * holds XP and not events — which works exactly because these are the awards
 * with no rounding in them. A partial award at a cap boundary could floor a
 * lone lesson to nothing, so a non-zero amount never reads as zero items.
 */
export function questCounters(todayRows: readonly XpQuestDay[], reviewsDue: number | null = null): XpQuestCounters {
  const amount = (kind: string) =>
    todayRows.filter((row) => row.kind === kind).reduce((total, row) => total + row.amount, 0);
  const items = (kind: string, worth: number) => {
    const earned = amount(kind);
    return earned === 0 ? 0 : Math.max(1, Math.floor(earned / worth));
  };

  return {
    reviewsAnswered: amount("reviewAnswered") / XP_AWARDS.reviewAnswered,
    reviewsCorrect: amount("reviewCorrect") / XP_AWARDS.reviewCorrect,
    lessonsStarted: items("lessonLearned", XP_AWARDS.lessonLearned),
    gamesFinished: items("gameFinished", XP_AWARDS.gameFinished),
    reviewsDue,
  };
}

/**
 * The size of a member's ordinary day, from the days before this one.
 *
 * Before this one, on purpose. A profile that included today would change as
 * the member worked, and the board would rearrange itself underneath them —
 * finishing forty reviews would summon a fifty-review quest that was not there
 * when they sat down.
 *
 * Averaged over active days rather than over calendar days, so a member who
 * studies twice a week is measured on what those two days look like rather
 * than being told they do fourteen reviews a day.
 */
export function questReviewsPerActiveDay(rows: readonly XpQuestDay[], today: string): number {
  const perDay = new Map<string, number>();
  for (const row of rows) {
    if (row.dayKey >= today || row.kind !== "reviewAnswered") continue;
    perDay.set(row.dayKey, (perDay.get(row.dayKey) ?? 0) + row.amount / XP_AWARDS.reviewAnswered);
  }
  if (perDay.size === 0) return 0;
  const total = [...perDay.values()].reduce((sum, count) => sum + count, 0);
  return Math.round(total / perDay.size);
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Whole days from the epoch, for a rotation that turns over at midnight. */
function dayIndex(dayKey: string): number {
  const at = new Date(`${dayKey}T00:00:00Z`).getTime();
  return Number.isFinite(at) ? Math.floor(at / MS_PER_DAY) : 0;
}

/**
 * The day's board.
 *
 * Everything within reach, rotated so a member with four eligible quests is
 * not shown the same three for the rest of their life, and cut to three. The
 * rotation is a function of the date alone: deterministic, so two reads on the
 * same day agree, and no storage, so there is nothing to fall out of step.
 */
export function chooseDailyQuests(reviewsPerActiveDay: number, dayKey: string): XpQuest[] {
  const eligible = XP_QUESTS.filter((quest) => quest.asksFor <= reviewsPerActiveDay);
  if (eligible.length <= XP_QUESTS_PER_DAY) return eligible;
  const from = dayIndex(dayKey) % eligible.length;
  return [...eligible.slice(from), ...eligible.slice(0, from)].slice(0, XP_QUESTS_PER_DAY);
}

/**
 * How far along one quest is.
 *
 * `queueCleared` is measured in reviews answered against the day's whole
 * pile - answered plus still due - so it reads as "12 of 20" rather than as a
 * tick that appears from nowhere. It is only *finished* when nothing is due
 * and the member has actually answered something today: an empty queue belongs
 * to everybody who never studies, and paying them for it every morning would
 * make the quest a joke.
 */
export function questProgress(quest: XpQuest, counters: XpQuestCounters): XpQuestProgress {
  const xp = XP_BONUSES[quest.kind];
  const wrong = Math.max(0, counters.reviewsAnswered - counters.reviewsCorrect);

  if (quest.kind === "wellRoundedDay") {
    const at = Math.min(counters.lessonsStarted, 1) + Math.min(counters.gamesFinished, 1);
    return { kind: quest.kind, at, target: 2, done: at >= 2, spoiled: false, xp };
  }

  if (quest.kind === "fiftyReviewDay") {
    const at = counters.reviewsAnswered;
    return {
      kind: quest.kind,
      at,
      target: XP_FIFTY_REVIEW_DAY_TARGET,
      done: at >= XP_FIFTY_REVIEW_DAY_TARGET,
      spoiled: false,
      xp,
    };
  }

  if (quest.kind === "flawlessDay") {
    const at = counters.reviewsAnswered;
    return {
      kind: quest.kind,
      at,
      target: XP_FLAWLESS_DAY_MIN,
      done: wrong === 0 && at >= XP_FLAWLESS_DAY_MIN,
      spoiled: wrong > 0,
      xp,
    };
  }

  const due = counters.reviewsDue;
  return {
    kind: quest.kind,
    at: counters.reviewsAnswered,
    /* A day that has not been counted gets a target one above where it
       stands, so an uncounted queue never draws itself as finished. */
    target: counters.reviewsAnswered + (due ?? 1),
    done: due === 0 && counters.reviewsAnswered > 0,
    spoiled: false,
    xp,
  };
}

export type XpQuestBoard = {
  dayKey: string;
  quests: XpQuestProgress[];
  /** Kinds already paid today, so the board can show them ticked. */
  paid: XpQuestKind[];
  counters: XpQuestCounters;
};

/** Which of the day's quests have been paid, read off the day's own rows. */
export function paidQuestKinds(todayRows: readonly XpQuestDay[]): XpQuestKind[] {
  const kinds = new Set(todayRows.map((row) => row.kind));
  return XP_QUEST_KINDS.filter((kind) => kinds.has(kind));
}

/**
 * The awards a settlement owes.
 *
 * Skips anything already paid rather than leaning on the once-a-day key,
 * because that key costs two round trips to discover what a set already in
 * hand can answer for nothing. It stays behind this as the guard against two
 * answers settling at once, which is what it is for.
 */
export function completedQuestAwards(
  quests: readonly XpQuest[],
  counters: XpQuestCounters,
  paid: readonly XpQuestKind[],
): XpAwardRequest[] {
  const already = new Set(paid);
  return quests
    .filter((quest) => !already.has(quest.kind) && questProgress(quest, counters).done)
    .map((quest) => ({ kind: quest.kind, note: XP_QUEST_NOTES[quest.kind] }));
}
