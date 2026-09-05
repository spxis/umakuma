import { describe, expect, it } from "vitest";

import { XP_AWARDS, XP_BONUSES, XP_COMMITTED_DAY, XP_ONCE_PER_DAY } from "./xpAwards";
import {
  chooseDailyQuests,
  completedQuestAwards,
  paidQuestKinds,
  questCounters,
  questProgress,
  questReviewsPerActiveDay,
  XP_FIFTY_REVIEW_DAY_TARGET,
  XP_FLAWLESS_DAY_MIN,
  XP_QUEST_KINDS,
  XP_QUESTS,
  XP_QUESTS_PER_DAY,
  type XpQuest,
  type XpQuestDay,
  type XpQuestKind,
} from "./xpQuests";
import { XP_QUEST_BLURBS, XP_QUEST_NOTES, XP_QUEST_TITLES } from "./xpQuestsCopy";

/**
 * The daily quests, held to the two rules they exist under.
 *
 * A quest a member cannot finish teaches them to ignore quests, so selection
 * has to be honest about the size of somebody's day. And a quest is a question
 * about today's rows, so nothing here may need storing — every test below
 * builds its world out of `XpEvent` rows and nothing else.
 */

const day = (n: number) => new Date(Date.UTC(2026, 8, n)).toISOString().slice(0, 10);
const TODAY = day(20);

const reviews = (dayKey: string, count: number): XpQuestDay => ({
  dayKey,
  kind: "reviewAnswered",
  amount: count * XP_AWARDS.reviewAnswered,
});
const correct = (dayKey: string, count: number): XpQuestDay => ({
  dayKey,
  kind: "reviewCorrect",
  amount: count * XP_AWARDS.reviewCorrect,
});
const lessons = (dayKey: string, count: number): XpQuestDay => ({
  dayKey,
  kind: "lessonLearned",
  amount: count * XP_AWARDS.lessonLearned,
});
const games = (dayKey: string, count: number): XpQuestDay => ({
  dayKey,
  kind: "gameFinished",
  amount: count * XP_AWARDS.gameFinished,
});

const questFor = (kind: XpQuestKind): XpQuest => XP_QUESTS.find((quest) => quest.kind === kind)!;
const kinds = (quests: readonly { kind: string }[]) => quests.map((quest) => quest.kind);

describe("choosing quests a member can actually finish", () => {
  it("gives a member with no history the two any day can finish", () => {
    /* Somebody on their first afternoon has no ordinary day yet, and being
       asked for fifty reviews before answering one is how a board becomes
       wallpaper. */
    const chosen = chooseDailyQuests(questReviewsPerActiveDay([], TODAY), TODAY);
    expect(kinds(chosen).sort()).toEqual(["queueCleared", "wellRoundedDay"]);
  });

  it("never asks a light member for a heavy day", () => {
    const light = [reviews(day(17), 8), reviews(day(18), 12), reviews(day(19), 10)];
    const chosen = chooseDailyQuests(questReviewsPerActiveDay(light, TODAY), TODAY);
    expect(kinds(chosen)).not.toContain("fiftyReviewDay");
    expect(kinds(chosen)).not.toContain("flawlessDay");
  });

  it("offers the harder ones once the ordinary day reaches them", () => {
    const heavy = [reviews(day(17), 60), reviews(day(18), 55), reviews(day(19), 65)];
    const ordinary = questReviewsPerActiveDay(heavy, TODAY);
    /* Four are within reach and three are shown, so one sits out each day.
       Over four days every one of them comes round. */
    const week = [day(20), day(21), day(22), day(23)].flatMap((dayKey) =>
      kinds(chooseDailyQuests(ordinary, dayKey)),
    );
    expect(chooseDailyQuests(ordinary, TODAY)).toHaveLength(XP_QUESTS_PER_DAY);
    for (const kind of XP_QUEST_KINDS) expect(week, kind).toContain(kind);
  });

  it("measures the ordinary day on days the member showed up, not on the calendar", () => {
    /* A member who studies twice a week does sixty reviews on a study day.
       Averaging over the fortnight would report nine and quietly demote them
       to the gentle board. */
    const twiceAWeek = [reviews(day(13), 60), reviews(day(19), 60)];
    expect(questReviewsPerActiveDay(twiceAWeek, TODAY)).toBe(60);
  });

  it("ignores today, so the board cannot rearrange itself under somebody", () => {
    /* Finishing forty reviews must not summon a fifty-review quest that was
       not there when they sat down. */
    const rows = [reviews(day(19), 5), reviews(TODAY, 300)];
    expect(questReviewsPerActiveDay(rows, TODAY)).toBe(5);
  });

  it("shows at most three, and turns them over rather than repeating forever", () => {
    const heavy = 80;
    const boards = [day(20), day(21), day(22), day(23)].map((dayKey) =>
      kinds(chooseDailyQuests(heavy, dayKey)).sort().join(","),
    );
    for (const board of boards) expect(board.split(",")).toHaveLength(XP_QUESTS_PER_DAY);
    expect(new Set(boards).size).toBeGreaterThan(1);
  });

  it("answers the same on two reads of the same day", () => {
    expect(kinds(chooseDailyQuests(80, TODAY))).toEqual(kinds(chooseDailyQuests(80, TODAY)));
  });
});

describe("reading today out of today's rows", () => {
  it("counts reviews, lessons and games from the XP they paid", () => {
    const counters = questCounters([reviews(TODAY, 34), correct(TODAY, 30), lessons(TODAY, 4), games(TODAY, 1)]);
    expect(counters).toMatchObject({
      reviewsAnswered: 34,
      reviewsCorrect: 30,
      lessonsStarted: 4,
      gamesFinished: 1,
    });
  });

  it("never reads a lesson that was paid as no lesson at all", () => {
    /* A partial award at a cap boundary can leave less XP on the row than one
       item is worth, and flooring that to zero would lose the item. */
    expect(questCounters([{ dayKey: TODAY, kind: "lessonLearned", amount: 1 }]).lessonsStarted).toBe(1);
  });

  it("says nothing about a queue nobody counted", () => {
    expect(questCounters([reviews(TODAY, 5)]).reviewsDue).toBeNull();
  });
});

describe("finishing a quest", () => {
  it("finishes fifty reviews on the fiftieth and not before", () => {
    const quest = questFor("fiftyReviewDay");
    expect(questProgress(quest, questCounters([reviews(TODAY, 49)])).done).toBe(false);
    const at = questProgress(quest, questCounters([reviews(TODAY, XP_FIFTY_REVIEW_DAY_TARGET)]));
    expect(at.done).toBe(true);
    expect(at.target).toBe(XP_FIFTY_REVIEW_DAY_TARGET);
  });

  it("wants both halves of a well-rounded day", () => {
    const quest = questFor("wellRoundedDay");
    expect(questProgress(quest, questCounters([lessons(TODAY, 9)])).at).toBe(1);
    expect(questProgress(quest, questCounters([lessons(TODAY, 9)])).done).toBe(false);
    expect(questProgress(quest, questCounters([lessons(TODAY, 1), games(TODAY, 1)])).done).toBe(true);
  });

  it("marks a flawless day spoiled rather than leaving the bar at nothing", () => {
    /* Forty reviews and one mistake is not "no progress", it is "not today".
       A bar stuck at zero after a real session reads as a bug. */
    const quest = questFor("flawlessDay");
    const spoiled = questProgress(quest, questCounters([reviews(TODAY, 40), correct(TODAY, 39)]));
    expect(spoiled.done).toBe(false);
    expect(spoiled.spoiled).toBe(true);
    expect(spoiled.at).toBe(40);

    const clean = questProgress(
      quest,
      questCounters([reviews(TODAY, XP_FLAWLESS_DAY_MIN), correct(TODAY, XP_FLAWLESS_DAY_MIN)]),
    );
    expect(clean.done).toBe(true);
    expect(clean.spoiled).toBe(false);
  });

  it("will not pay for an empty queue somebody never touched", () => {
    /* Everybody who does not study has an empty queue. Paying for it every
       morning would make the quest a joke. */
    const quest = questFor("queueCleared");
    expect(questProgress(quest, questCounters([], 0)).done).toBe(false);
    expect(questProgress(quest, questCounters([reviews(TODAY, 12)], 0)).done).toBe(true);
  });

  it("does not draw an uncounted queue as finished", () => {
    const quest = questFor("queueCleared");
    const progress = questProgress(quest, questCounters([reviews(TODAY, 12)], null));
    expect(progress.done).toBe(false);
    expect(progress.target).toBeGreaterThan(progress.at);
  });

  it("measures the queue against the day's whole pile, so it reads as a fraction", () => {
    const progress = questProgress(questFor("queueCleared"), questCounters([reviews(TODAY, 12)], 8));
    expect(progress.at).toBe(12);
    expect(progress.target).toBe(20);
  });
});

describe("what a settlement owes", () => {
  const board = [questFor("wellRoundedDay"), questFor("fiftyReviewDay")];

  it("pays a quest the moment it is finished", () => {
    const counters = questCounters([reviews(TODAY, 50), lessons(TODAY, 1), games(TODAY, 1)]);
    expect(kinds(completedQuestAwards(board, counters, [])).sort()).toEqual([
      "fiftyReviewDay",
      "wellRoundedDay",
    ]);
  });

  it("pays it exactly once, however many answers follow", () => {
    /* The failure this guards: crossing fifty and then answering another
       twenty settles the day's quests twenty more times. */
    const counters = questCounters([reviews(TODAY, 70), lessons(TODAY, 1), games(TODAY, 1)]);
    const paid = paidQuestKinds([
      reviews(TODAY, 70),
      { dayKey: TODAY, kind: "fiftyReviewDay", amount: XP_BONUSES.fiftyReviewDay },
    ]);
    expect(paid).toEqual(["fiftyReviewDay"]);
    expect(kinds(completedQuestAwards(board, counters, paid))).toEqual(["wellRoundedDay"]);
  });

  it("owes nothing on a day nothing was finished", () => {
    expect(completedQuestAwards(board, questCounters([reviews(TODAY, 20)]), [])).toEqual([]);
  });

  it("says which quest a history line was for", () => {
    const [award] = completedQuestAwards([questFor("fiftyReviewDay")], questCounters([reviews(TODAY, 50)]), []);
    expect(award.note).toBe(XP_QUEST_NOTES.fiftyReviewDay);
  });
});

describe("the quest economy", () => {
  it("prices every quest as a bonus, once a day", () => {
    /* Both halves matter. Without a price in XP_BONUSES the award cannot be
       made at all, and without the once-a-day key a second settlement in the
       same second could pay twice. */
    for (const kind of XP_QUEST_KINDS) {
      expect(XP_BONUSES[kind], kind).toBeGreaterThan(0);
      expect(XP_BONUSES[kind] % 5, `${kind} is ${XP_BONUSES[kind]}`).toBe(0);
      expect(XP_ONCE_PER_DAY, kind).toContain(kind);
    }
  });

  it("keeps a whole day of quests a garnish rather than a second economy", () => {
    /* The rule the repriced numbers exist to keep, and the one a later edit is
       most likely to break quietly. `XP_COMMITTED_DAY` is what a day of
       committed study is worth. The board somebody finishes on an ordinary
       good day - everything except the flawless one, which almost never lands
       - has to stay under a third of it, and the whole pool at once under all
       of it. At the proposed prices the ordinary board was 125, which is most
       of a day's study for finishing a day's study. */
    const ordinaryBoard = XP_QUEST_KINDS.filter((kind) => kind !== "flawlessDay").reduce(
      (total, kind) => total + XP_BONUSES[kind],
      0,
    );
    const wholePool = XP_QUEST_KINDS.reduce((total, kind) => total + XP_BONUSES[kind], 0);
    expect(ordinaryBoard).toBeLessThan(XP_COMMITTED_DAY / 3);
    expect(wholePool).toBeLessThan(XP_COMMITTED_DAY);
  });

  it("orders the pool by what it asks for, so the gentle two come first", () => {
    const asks = XP_QUESTS.map((quest) => quest.asksFor);
    expect(asks).toEqual([...asks].sort((a, b) => a - b));
  });

  it("gives every quest something to read", () => {
    for (const kind of XP_QUEST_KINDS) {
      expect(XP_QUEST_TITLES[kind], kind).toBeTruthy();
      expect(XP_QUEST_BLURBS[kind].trim().endsWith("."), kind).toBe(true);
      expect(XP_QUEST_NOTES[kind].trim().endsWith("."), kind).toBe(true);
    }
  });
});
