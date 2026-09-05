import "server-only";

import { KANJI_LADDER_LEVELS } from "@/lib/kanjiLadder";
import { prisma } from "@/lib/prisma";

import { resolveUkLevel, type UkLevelResolution, type UkLevelTotals } from "./ukLevel";
import { awardXpQuietly } from "@/lib/xp/xpServer";

/**
 * Reading and writing a member's UmaKuma level.
 *
 * `Account.ukLevel` is a materialised copy, and this file is the only place
 * that writes it. Every path that can change a member's standing — a review,
 * a placement, a WaniKani import, a reconcile after a curriculum bump — ends
 * by calling `syncAccountUkLevel`, so there is one answer to "how did this
 * number get here" rather than six.
 */

const TTL_MS = 10 * 60_000;
let totalsHeld: { totals: UkLevelTotals[]; builtAtMs: number } | null = null;

/**
 * How many kanji and radicals each level teaches, counted from the curriculum
 * table rather than the JSON: the table is what the admin console edits, and
 * a level gate computed from a stale file would disagree with what a member
 * is actually being shown.
 */
export async function ukLevelTotals(): Promise<UkLevelTotals[]> {
  if (totalsHeld && Date.now() - totalsHeld.builtAtMs <= TTL_MS) return totalsHeld.totals;

  const grouped = await prisma.ukSubject.groupBy({
    by: ["level", "kind"],
    where: { removedAt: null },
    _count: { _all: true },
  });

  const byLevel = new Map<number, UkLevelTotals>();
  for (let level = 1; level <= KANJI_LADDER_LEVELS; level += 1) {
    byLevel.set(level, { level, kanji: 0, radicals: 0 });
  }
  for (const row of grouped) {
    const entry = byLevel.get(row.level);
    if (!entry) continue;
    if (row.kind === "kanji") entry.kanji = row._count._all;
    if (row.kind === "radical") entry.radicals = row._count._all;
  }

  const totals = [...byLevel.values()];
  totalsHeld = { totals, builtAtMs: Date.now() };
  return totals;
}

/** Forgets the counts, for after a seed or an admin edit. */
export function clearUkLevelTotalsCache(): void {
  totalsHeld = null;
}

/** What a member's level would be right now, without writing it. */
export async function deriveUkLevel(accountId: string): Promise<UkLevelResolution> {
  const [account, totals, states, passedFinals] = await Promise.all([
    prisma.account.findUnique({ where: { id: accountId }, select: { ukLevelFloor: true } }),
    ukLevelTotals(),
    prisma.ukSrsState.findMany({
      where: { accountId },
      select: { srsStage: true, passedAt: true, subject: { select: { level: true, kind: true } } },
    }),
    /* Only finals that must be passed, and only the ones that were. A
       checkpoint never holds anybody, so it is not asked about here. */
    prisma.levelTest.findMany({
      where: { accountId, mustPass: true, verdict: { in: ["solid", "passed"] } },
      select: { gateKey: true },
      distinct: ["gateKey"],
    }),
  ]);

  return resolveUkLevel({
    rows: states.map((state) => ({
      level: state.subject.level,
      kind: state.subject.kind,
      srsStage: state.srsStage,
      passedAt: state.passedAt,
    })),
    totals,
    floor: account?.ukLevelFloor ?? 1,
    passedGateKeys: passedFinals.map((row) => row.gateKey),
  });
}

/**
 * Recomputes and stores the level. The one writer.
 *
 * Returns what it wrote, so a caller that has just taken a review can tell a
 * member they levelled up without asking again.
 */
export async function syncAccountUkLevel(accountId: string): Promise<UkLevelResolution> {
  const resolved = await deriveUkLevel(accountId);
  await prisma.account.update({
    where: { id: accountId },
    data: { ukLevel: resolved.level, ukLevelUpdatedAt: new Date() },
  });
  return resolved;
}

/** The sources that mean "knowledge from somewhere else", which is what the placement award is for. */
const EXTERNAL_PLACEMENT_SOURCES = new Set<string>(["placement_test", "wanikani"]);

/**
 * Raises the floor and re-derives. Never lowers: a floor is what a placement
 * test or a WaniKani import bought, and taking it back is the one thing that
 * would make either of them not worth sitting.
 */
export async function raiseUkLevelFloor({
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
    select: { ukLevelFloor: true, ukPlacedAt: true },
  });
  const current = account?.ukLevelFloor ?? 1;
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
      ? { ukLevelFloor: next, ukPlacedAt: new Date(), ukPlacementSource: source }
      : { ukLevelFloor: next },
  });

  /* The placement award: once, ever, and only for knowledge that came from
     somewhere else. `ukPlacedAt` being null before this call is what makes it
     the first placement; the source is what makes it external - an admin
     raising a floor, or a member's own bump-up, is not arriving with
     knowledge. Quiet, because a placement that succeeded must not fail on the
     XP it hands out. */
  if (moved && account?.ukPlacedAt === null && EXTERNAL_PLACEMENT_SOURCES.has(source)) {
    await awardXpQuietly({ accountId, requests: [{ kind: "placementAward", note: `placed at level ${next}` }] });
  }
  return syncAccountUkLevel(accountId);
}
