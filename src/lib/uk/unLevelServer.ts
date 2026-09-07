import "server-only";

import { KANJI_LADDER_LEVELS } from "@/lib/kanjiLadder";
import { LADDER_STREAMS, type LadderStreamValue } from "@/lib/ladder/ladderStreams";
import { prisma } from "@/lib/prisma";

import { ladderColumns } from "./ladderColumns";
import { resolveUnLevel, type UkLevelResolution, type UkLevelTotals } from "./unLevel";
import { awardXpQuietly } from "@/lib/xp/xpServer";
import { XP_REASONS } from "@/lib/xp/xpStudyAwards";

/**
 * Reading and writing a member's UmaKuma level.
 *
 * `Account.unLevel` and `Account.ugLevel` are materialised copies, and this
 * file is the only place that writes them. Every path that can change a
 * member's standing — a review, a placement, a WaniKani import, a level test —
 * ends by calling `syncAccountLevels`, which writes **both**, so there is one
 * answer to "how did this number get here" rather than six.
 *
 * **They are a cache, and they go stale.** Deriving costs 412ms for one member
 * and 2.3s for everyone, measured, which is why they are stored at all - but
 * a stored level is computed against the ladder as it stood, and the ladders
 * are rebuilt when the evidence says to. Nothing here runs on a rebuild; only
 * a review does. `pnpm ladder:relevel` recomputes everybody, and the rebalance
 * runbook is refresh, seed, relevel. Before that existed, every member who had
 * not reviewed since UN 2.0.0 moved 95 kanji was carrying a 1.0.0 level.
 */

const TTL_MS = 10 * 60_000;
const totalsHeld = new Map<LadderStreamValue, { totals: UkLevelTotals[]; builtAtMs: number }>();

/**
 * How many kanji and radicals each level teaches, counted from the curriculum
 * table rather than the JSON: the table is what the admin console edits, and
 * a level gate computed from a stale file would disagree with what a member
 * is actually being shown.
 */
export async function unLevelTotals(stream: LadderStreamValue = LADDER_STREAMS.un): Promise<UkLevelTotals[]> {
  const held = totalsHeld.get(stream);
  if (held && Date.now() - held.builtAtMs <= TTL_MS) return held.totals;

  const columns = ladderColumns(stream);
  /* Grouped by whichever column is this ladder's. The two share a table, so
     the level a kanji sits on is a different number on each. */
  const grouped = await prisma.ukSubject.groupBy({
    by: [columns.subjectLevel, "kind"],
    where: { removedAt: null },
    _count: { _all: true },
  });

  const byLevel = new Map<number, UkLevelTotals>();
  for (let level = 1; level <= columns.maxLevel; level += 1) {
    byLevel.set(level, { level, kanji: 0, radicals: 0 });
  }
  for (const row of grouped) {
    const entry = byLevel.get(row[columns.subjectLevel]);
    if (!entry) continue;
    if (row.kind === "kanji") entry.kanji = row._count._all;
    if (row.kind === "radical") entry.radicals = row._count._all;
  }

  const totals = [...byLevel.values()];
  totalsHeld.set(stream, { totals, builtAtMs: Date.now() });
  return totals;
}

/** Forgets the counts, for after a seed or an admin edit. */
export function clearUkLevelTotalsCache(): void {
  totalsHeld.clear();
}

/**
 * What a member's level on one ladder would be right now, without writing it.
 *
 * The stream is explicit rather than read from the account, because the two
 * questions are different and both get asked: the study page wants the level
 * on the ladder the member follows, and the UN explorer wants the UN level
 * whoever is looking. `deriveMemberLevel` answers the first.
 */
export async function deriveLadderLevel(accountId: string, stream: LadderStreamValue): Promise<UkLevelResolution> {
  const columns = ladderColumns(stream);
  const [account, totals, states, passedFinals] = await Promise.all([
    prisma.account.findUnique({ where: { id: accountId }, select: { [columns.accountFloor]: true } }),
    unLevelTotals(stream),
    prisma.ukSrsState.findMany({
      where: { accountId },
      select: { srsStage: true, passedAt: true, subject: { select: { level: true, ugLevel: true, kind: true } } },
    }),
    /* Only finals that must be passed, and only the ones that were. A
       checkpoint never holds anybody, so it is not asked about here. */
    prisma.levelTest.findMany({
      where: { accountId, mustPass: true, verdict: { in: ["solid", "passed"] } },
      select: { gateKey: true },
      distinct: ["gateKey"],
    }),
  ]);

  return resolveUnLevel({
    rows: states.map((state) => ({
      level: state.subject[columns.subjectLevel],
      kind: state.subject.kind,
      srsStage: state.srsStage,
      passedAt: state.passedAt,
    })),
    totals,
    floor: (account as Record<string, number> | null)?.[columns.accountFloor] ?? 1,
    maxLevel: columns.maxLevel,
    passedGateKeys: passedFinals.map((row) => row.gateKey),
    milestones: columns.jlptMilestones,
  });
}

/** The member's level on the ladder they follow. */
export async function deriveMemberLevel(accountId: string): Promise<UkLevelResolution> {
  const account = await prisma.account.findUnique({ where: { id: accountId }, select: { ladderStream: true } });
  return deriveLadderLevel(accountId, account?.ladderStream ?? LADDER_STREAMS.un);
}

/**
 * Recomputes and stores the level on every ladder. The one writer.
 *
 * Both at once, because a review answers a question about a subject and the
 * subject sits on both ladders - the member's standing on each moved, whether
 * or not they follow it. Writing only the one they follow is how
 * `Account.ugLevel` came to be a column nothing wrote.
 *
 * Returns the standing on the ladder the member follows, so a caller that has
 * just taken a review can tell them they levelled up without asking again.
 */
export async function syncAccountLevels(accountId: string): Promise<UkLevelResolution> {
  const account = await prisma.account.findUnique({ where: { id: accountId }, select: { ladderStream: true } });
  const own = account?.ladderStream ?? LADDER_STREAMS.un;

  const [un, ug] = await Promise.all([
    deriveLadderLevel(accountId, LADDER_STREAMS.un),
    deriveLadderLevel(accountId, LADDER_STREAMS.ug),
  ]);
  /* Spelled out rather than built from `ladderColumns`, on purpose: the test
     that keeps this the only writer of these columns reads the source for the
     literal field names, and a write assembled from a lookup is one it cannot
     see. Two ladders, four fields, and every one of them named where it is
     written. */
  const now = new Date();
  await prisma.account.update({
    where: { id: accountId },
    data: { unLevel: un.level, unLevelUpdatedAt: now, ugLevel: ug.level, ugLevelUpdatedAt: now },
  });
  return own === LADDER_STREAMS.ug ? ug : un;
}

/** The sources that mean "knowledge from somewhere else", which is what the placement award is for. */
const EXTERNAL_PLACEMENT_SOURCES = new Set<string>(["placement_test", "wanikani"]);

/**
 * Raises the floor and re-derives. Never lowers: a floor is what a placement
 * test or a WaniKani import bought, and taking it back is the one thing that
 * would make either of them not worth sitting.
 */
export async function raiseUnLevelFloor({
  accountId,
  floor,
  source,
}: {
  accountId: string;
  floor: number;
  source: "placement_test" | "wanikani" | "self" | "admin";
}): Promise<UkLevelResolution> {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: { unLevelFloor: true, unPlacedAt: true },
  });
  const current = account?.unLevelFloor ?? 1;
  const next = Math.min(Math.max(floor, current), KANJI_LADDER_LEVELS);

  /* Only record who placed them when the floor actually moved.
   *
   * Stamping unconditionally meant a member who imported WaniKani and later
   * sat the placement test was recorded as `placement_test` even when the test
   * found nothing the import had not already given them — so the one field
   * that says how somebody got where they are would name the wrong thing.
   * Raise-only is the rule everywhere else here; this makes the provenance
   * raise-only too. Found by the agent building the placement test, which is
   * the caller that would have been blamed for it. */
  const moved = next > current;
  await prisma.account.update({
    where: { id: accountId },
    data: moved
      ? { unLevelFloor: next, unPlacedAt: new Date(), unPlacementSource: source }
      : { unLevelFloor: next },
  });

  /* The placement award: once, ever, and only for knowledge that came from
     somewhere else. `unPlacedAt` being null before this call is what makes it
     the first placement; the source is what makes it external - an admin
     raising a floor, or a member's own bump-up, is not arriving with
     knowledge. Quiet, because a placement that succeeded must not fail on the
     XP it hands out. */
  let placementXp = 0;
  if (moved && account?.unPlacedAt === null && EXTERNAL_PLACEMENT_SOURCES.has(source)) {
    placementXp = await awardXpQuietly({
      accountId,
      requests: [{ kind: "placementAward", note: `placed at level ${next}` }],
    });
  }
  const resolution = await syncAccountLevels(accountId);
  /* Carried back rather than paid silently. It is the largest single award on
     the site and it happens once, ever, at the moment somebody decides
     whether this place is worth their time - the worst one to leave unsaid. */
  return placementXp > 0
    ? { ...resolution, earned: [{ xp: placementXp, reason: XP_REASONS.placement }] }
    : resolution;
}
