import "server-only";

import { getVancouverDateKey } from "@/lib/dailySnapshot";
import { prisma } from "@/lib/prisma";

import {
  chooseDailyQuests,
  completedQuestAwards,
  paidQuestKinds,
  questCounters,
  questProgress,
  questReviewsPerActiveDay,
  XP_QUEST_PROFILE_DAYS,
  type XpQuest,
  type XpQuestBoard,
  type XpQuestDay,
} from "./xpQuests";
import { awardXpQuietly } from "./xpServer";

/**
 * Reading and settling the day's quests, against rows that already exist.
 *
 * There is no quest table. Everything here is one `findMany` over the
 * member's last four weeks of `XpEvent` rows, which answers three questions at
 * once: what kind of day this member ordinarily has (the days before today),
 * how today is going (today's rows), and which quests have already been paid
 * (today's rows for the quest kinds). A second read, of the review queue, is
 * taken only when `queueCleared` is on the board and still outstanding.
 *
 * The cost is one small indexed read per settlement, and settlement runs on
 * every answered review. That is the price of quests that update as somebody
 * works rather than when they next open a page, and it is why the window is
 * four weeks rather than the member's whole history: a three-year member's
 * full history is thousands of rows, and none of the older ones changes what a
 * quest asks for today.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** The rows both questions are answered from: four weeks up to and including today. */
async function questWindow(accountId: string, now: Date): Promise<XpQuestDay[]> {
  const from = getVancouverDateKey(new Date(now.getTime() - XP_QUEST_PROFILE_DAYS * MS_PER_DAY));
  /* `dayKey` is `YYYY-MM-DD`, so it sorts and compares as a date without
     being one. That is the whole reason the column is shaped that way. */
  return prisma.xpEvent.findMany({
    where: { accountId, dayKey: { gte: from } },
    select: { dayKey: true, kind: true, amount: true },
  });
}

/** Items whose review has come round, the same question the study queue asks. */
async function reviewsDue(accountId: string, now: Date): Promise<number> {
  return prisma.ukSrsState.count({ where: { accountId, availableAt: { not: null, lte: now } } });
}

/** Today's board, drawn: what was chosen, how far along each one is, what it pays. */
export async function loadQuestBoard(accountId: string, now = new Date()): Promise<XpQuestBoard> {
  const dayKey = getVancouverDateKey(now);
  const rows = await questWindow(accountId, now);
  const todayRows = rows.filter((row) => row.dayKey === dayKey);
  const quests = chooseDailyQuests(questReviewsPerActiveDay(rows, dayKey), dayKey);

  /* The board always counts the queue, unlike settlement: a member looking at
     "empty your queue" is owed the number, and a page load can afford it. */
  const due = quests.some((quest) => quest.needsQueue) ? await reviewsDue(accountId, now) : null;
  const counters = questCounters(todayRows, due);

  return {
    dayKey,
    quests: quests.map((quest) => questProgress(quest, counters)),
    paid: paidQuestKinds(todayRows),
    counters,
  };
}

/**
 * Pays for any of today's quests that have just been finished.
 *
 * Called after XP has been awarded for a review, a lesson or a game, and it
 * can never fail what it is attached to: an answer that scored correctly is a
 * completed answer whether or not the bookkeeping beside it worked, so every
 * failure is logged and swallowed. `awardXpQuietly` already does that for the
 * awards themselves; this catch is for the reads in front of them.
 *
 * Outstanding quests are worked out before anything else, and a settlement
 * with none returns without touching the queue or the award path. On a member
 * who has finished today's board — the common case, late in a session — that
 * is one read and nothing more.
 */
export async function settleDailyQuests({
  accountId,
  now = new Date(),
}: {
  accountId: string;
  now?: Date;
}): Promise<number> {
  try {
    const dayKey = getVancouverDateKey(now);
    const rows = await questWindow(accountId, now);
    const todayRows = rows.filter((row) => row.dayKey === dayKey);
    const paid = paidQuestKinds(todayRows);
    const already = new Set<string>(paid);
    const outstanding: XpQuest[] = chooseDailyQuests(questReviewsPerActiveDay(rows, dayKey), dayKey).filter(
      (quest) => !already.has(quest.kind),
    );
    if (outstanding.length === 0) return 0;

    const due = outstanding.some((quest) => quest.needsQueue) ? await reviewsDue(accountId, now) : null;
    const requests = completedQuestAwards(outstanding, questCounters(todayRows, due), paid);
    if (requests.length === 0) return 0;

    return await awardXpQuietly({ accountId, requests, now });
  } catch (problem) {
    console.error("Could not settle the day's quests", problem);
    return 0;
  }
}
